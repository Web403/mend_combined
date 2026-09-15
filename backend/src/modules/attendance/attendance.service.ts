import { AttendanceRepository } from "./attendance.repository";
import { AttendanceGeoHelper } from "./attendance-geo.helper";
import { AttendanceViolationHelper } from "./attendance-violations.helper";
import { AttendanceErrors } from "./attendance.errors";
import { HotelGeoZoneStore } from "../../shared/stores/hotel-geo-zone.store";
import { LocationCaptureEvent } from "../../shared/enums/geo.enum";
import type {
  ClockInRequestDto,
  ClockOutRequestDto,
  AttendanceResponseDto,
  IAttendance,
  IViolationFlags,
} from "../../shared/interfaces/attendance";
import mongoose from "mongoose";

export class AttendanceService {
  private readonly repo = new AttendanceRepository();

  async clockIn(
    hotelId: mongoose.Types.ObjectId,
    dto: ClockInRequestDto,
  ): Promise<AttendanceResponseDto> {
    // 1. Prevent duplicate open shift
    const existing = await this.repo.findOpenShift(hotelId, dto.userId);
    if (existing) throw AttendanceErrors.alreadyClockedIn();

    // 2. Resolve hotel geo zone — throws if not configured
    const hotelZone = await HotelGeoZoneStore.get(dto.hotelId);
    if (!hotelZone) throw AttendanceErrors.hotelZoneMissing(dto.hotelId);

    // 3. Geo validation (FR6, FR7)
    const geoResult = AttendanceGeoHelper.validate(
      {
        userId: dto.userId,
        hotelId: dto.hotelId,
        event: LocationCaptureEvent.CLOCK_IN,
        coords: dto.coords,
        offlineQueuedAt: dto.offlineQueuedAt,
      },
      hotelZone,
    );

    if (!geoResult.allowed) {
      throw AttendanceErrors.geoBlocked(
        geoResult.blockReason ?? "Location check failed.",
      );
    }

    const clockInTime = dto.offlineQueuedAt
      ? new Date(dto.offlineQueuedAt)
      : new Date();

    // 4. Recovery gap check — compare against last completed shift
    const lastShift = await this.repo.findLastCompletedShift(hotelId, dto.userId);
    const recoveryMins = AttendanceViolationHelper.recoveryMinutes(
      lastShift?.clockOut,
      clockInTime,
    );

    const clockInFlags = AttendanceViolationHelper.evaluateClockIn({
      recoveryMinutes: recoveryMins,
    });

    // 5. Persist
    const record = await this.repo.createClockIn({
      hotelId,
      userId: dto.userId,
      clockIn: clockInTime,
      geoValidated: geoResult.allowed,
      offlineSync: geoResult.wasOffline,
      deviceId: dto.deviceId,
    });

    // Patch violation flags produced at clock-in time
    record.violationFlags = AttendanceViolationHelper.merge(clockInFlags);

    return this.toResponseDto(record, geoResult.wasOffline);
  }

  async clockOut(
    hotelId: mongoose.Types.ObjectId,
    dto: ClockOutRequestDto,
  ): Promise<AttendanceResponseDto> {
    // 1. Must have an open shift
    const openShift = await this.repo.findOpenShift(hotelId, dto.userId);
    if (!openShift) throw AttendanceErrors.notClockedIn();

    // 2. Resolve hotel geo zone
    const hotelZone = await HotelGeoZoneStore.get(dto.hotelId);
    if (!hotelZone) throw AttendanceErrors.hotelZoneMissing(dto.hotelId);

    // 3. Geo validation (FR6, FR7)
    const geoResult = AttendanceGeoHelper.validate(
      {
        userId: dto.userId,
        hotelId: dto.hotelId,
        event: LocationCaptureEvent.CLOCK_OUT,
        coords: dto.coords,
        offlineQueuedAt: dto.offlineQueuedAt,
      },
      hotelZone,
    );

    if (!geoResult.allowed) {
      throw AttendanceErrors.geoBlocked(
        geoResult.blockReason ?? "Location check failed.",
      );
    }

    const clockOutTime = dto.offlineQueuedAt
      ? new Date(dto.offlineQueuedAt)
      : new Date();

    // 4. Compute work duration & violation flags
    const workDurationMinutes = AttendanceViolationHelper.workDurationMinutes(
      openShift.clockIn,
      clockOutTime,
    );

    const clockOutFlags = AttendanceViolationHelper.evaluateClockOut({
      workDurationMinutes,
    });

    // Preserve any violation flags already set at clock-in
    const mergedFlags = AttendanceViolationHelper.merge(
      openShift.violationFlags,
      clockOutFlags,
    );

    // 5. Persist
    const updated = await this.repo.closeShift(hotelId, openShift.id, {
      clockOut: clockOutTime,
      workDurationMinutes,
      violationFlags: mergedFlags,
      geoValidated: geoResult.allowed,
    });

    if (!updated) throw AttendanceErrors.notClockedIn();

    return this.toResponseDto(updated, geoResult.wasOffline);
  }

  async getHistory(
    hotelId: mongoose.Types.ObjectId,
    query: any,
  ): Promise<AttendanceResponseDto[]> {
    const userId = typeof query.userId === "string" ? query.userId : undefined;
    const limit = query.limit ? Number(query.limit) : 50;
    const skip = query.page ? (Number(query.page) - 1) * limit : 0;
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;

    const records = await this.repo.findAllByHotel(hotelId, {
      userId,
      from,
      to,
      limit,
      skip,
    });

    return records.map((record) => this.toResponseDto(record, false));
  }

  async getLive(hotelId: mongoose.Types.ObjectId): Promise<AttendanceResponseDto[]> {
    const records = await this.repo.findLiveByHotel(hotelId);
    return records.map((record) => this.toResponseDto(record, false));
  }

  async getEmployeesWithAttendance(hotelId: mongoose.Types.ObjectId): Promise<AttendanceResponseDto[]> {
    const records = await this.repo.findEmployeesWithAttendance(hotelId);
    return records.map((record) => this.toResponseDto(record, false));
  }

  private buildViolationReasons(flags: IViolationFlags): string[] {
    const reasons: string[] = [];
    if (flags.exceeds10Hours) reasons.push("Shift exceeds maximum 10 hours.");
    if (flags.insufficientRecovery) reasons.push("Insufficient recovery time between shifts.");
    return reasons;
  }

  private toResponseDto(
    record: IAttendance,
    wasOffline: boolean,
  ): AttendanceResponseDto {
    const violationFlags = record.violationFlags || {
      exceeds10Hours: false,
      insufficientRecovery: false,
    };
    const violationReasons = this.buildViolationReasons(violationFlags);
    const messages: string[] = [];
    if (violationReasons.length) messages.push(...violationReasons);
    return {
      attendanceId: record.id,
      userId: record.userId,
      clockIn: record.clockIn.toISOString(),
      clockOut: record.clockOut?.toISOString(),
      workDurationMinutes: record.workDurationMinutes,
      geoValidated: record.geoValidated,
      wasOffline,
      violationFlags,
      message: messages.length ? messages.join(" ") : undefined,
      violationReasons: violationReasons.length ? violationReasons : undefined,
      blockReason: undefined,
    };
  }
}

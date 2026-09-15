// ─────────────────────────────────────────────────────────────────────────────
// modules/attendance/attendance.repository.ts
//
// All MongoDB access for the attendance module.
// The service layer must not reference AttendanceModel directly.
// ─────────────────────────────────────────────────────────────────────────────

import { v4 as uuidv4 } from "uuid";
import { AttendanceModel } from "./attendance.model";
import type {
  IAttendance,
  IViolationFlags,
} from "../../shared/interfaces/attendance";
import mongoose from "mongoose";

export class AttendanceRepository {
  // ── Reads ──────────────────────────────────────────────────────────────────

  /**
   * Returns the single open attendance record (no clockOut) for a user.
   * Returns null when the user is not currently clocked in.
   */
  async findOpenShift(
    hotelId: mongoose.Types.ObjectId,
    userId: mongoose.Types.ObjectId,
  ): Promise<IAttendance | null> {
    return AttendanceModel.findOne({
      hotelId,
      userId,
      clockOut: { $exists: false },
    })
      .sort({ clockIn: -1 })
      .lean();
  }

  /**
   * Most-recent completed attendance record for the user.
   * Used to compute the recovery gap before a new clock-in (FR – insufficient
   * recovery flag).
   */
  async findLastCompletedShift(
    hotelId: mongoose.Types.ObjectId,
    userId: mongoose.Types.ObjectId,
  ): Promise<IAttendance | null> {
    return AttendanceModel.findOne({
      hotelId,
      userId,
      clockOut: { $exists: true },
    })
      .sort({ clockOut: -1 })
      .lean();
  }

  /**
   * Paginated attendance history for a user within an optional date window.
   */
  async findByUser(
    hotelId: mongoose.Types.ObjectId,
    userId: mongoose.Types.ObjectId,
    opts: { from?: Date; to?: Date; limit?: number; skip?: number } = {},
  ): Promise<IAttendance[]> {
    const filter: Record<string, unknown> = { hotelId, userId };

    if (opts.from || opts.to) {
      filter.clockIn = {
        ...(opts.from ? { $gte: opts.from } : {}),
        ...(opts.to ? { $lte: opts.to } : {}),
      };
    }

    return AttendanceModel.find(filter)
      .sort({ clockIn: -1 })
      .skip(opts.skip ?? 0)
      .limit(opts.limit ?? 50)
      .lean();
  }

  /**
   * Paginated attendance history for all users of a hotel, with optional filters.
   */
  async findAllByHotel(
    hotelId: mongoose.Types.ObjectId,
    opts: { userId?: mongoose.Types.ObjectId; from?: Date; to?: Date; limit?: number; skip?: number } = {},
  ): Promise<IAttendance[]> {
    const filter: Record<string, unknown> = { hotelId };

    if (opts.userId) {
      filter.userId = opts.userId;
    }

    if (opts.from || opts.to) {
      filter.clockIn = {
        ...(opts.from ? { $gte: opts.from } : {}),
        ...(opts.to ? { $lte: opts.to } : {}),
      };
    }

    return AttendanceModel.find(filter)
      .sort({ clockIn: -1 })
      .skip(opts.skip ?? 0)
      .limit(opts.limit ?? 50)
      .lean();
  }

  /**
   * Currently clocked-in (live) shifts for a hotel.
   */
  async findLiveByHotel(hotelId: mongoose.Types.ObjectId): Promise<IAttendance[]> {
    return AttendanceModel.find({
      hotelId,
      clockOut: { $exists: false },
    })
      .sort({ clockIn: -1 })
      .lean();
  }

  // ── Writes ─────────────────────────────────────────────────────────────────

  /** Creates a new attendance record at clock-in time. */
  async createClockIn(data: {
    hotelId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    shiftId?: string;
    clockIn: Date;
    geoValidated: boolean;
    offlineSync: boolean;
    deviceId?: string;
  }): Promise<IAttendance> {
    const doc = await AttendanceModel.create({
      id: uuidv4(),
      schemaVersion: 1,
      hotelId: data.hotelId,
      userId: data.userId,
      shiftId: data.shiftId,
      clockIn: data.clockIn,
      geoValidated: data.geoValidated,
      violationFlags: {
        exceeds10Hours: false,
        insufficientRecovery: false,
      },
      deviceMeta: {
        offlineSync: data.offlineSync,
        deviceId: data.deviceId,
      },
    });

    return doc.toObject();
  }

  /**
   * Stamps clockOut, computes duration, and writes violation flags
   * in a single atomic update.
   */
  async closeShift(
    hotelId: mongoose.Types.ObjectId,
    attendanceId: mongoose.Types.ObjectId,
    data: {
      clockOut: Date;
      workDurationMinutes: number;
      recoveryMinutes?: number;
      violationFlags: IViolationFlags;
      geoValidated: boolean;
    },
  ): Promise<IAttendance | null> {
    return AttendanceModel.findOneAndUpdate(
      { hotelId, id: attendanceId, clockOut: { $exists: false } },
      {
        $set: {
          clockOut: data.clockOut,
          workDurationMinutes: data.workDurationMinutes,
          recoveryMinutes: data.recoveryMinutes,
          violationFlags: data.violationFlags,
          geoValidated: data.geoValidated,
        },
      },
      { new: true },
    ).lean();
  }

  async findEmployeesWithAttendance(hotelId: mongoose.Types.ObjectId): Promise<IAttendance[]> {
  return AttendanceModel.aggregate([
    {
      $match: { hotelId }
    },
    {
      $sort: {
        userId: 1,
        clockIn: -1
      }
    },
    {
      $group: {
        _id: "$userId",
        latestAttendance: {
          $first: "$$ROOT"
        }
      }
    },
    {
      $replaceRoot: {
        newRoot: "$latestAttendance"
      }
    }
  ]);
}
}
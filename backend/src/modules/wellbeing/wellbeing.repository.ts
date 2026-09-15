import { nanoid } from "nanoid";
import { AttendanceModel } from "../attendance/attendance.model";
import { WellbeingModel } from "./wellbeing.model";
import { IWellbeing } from "../../shared/interfaces";

export interface WellbeingListOptions {
  page?: number;
  limit?: number;
  fromDate?: Date;
  toDate?: Date;
  userId?: string;
  alertStatus?: string;
  fatigueRiskLevel?: string;
}

export class WellbeingRepository {
  async findAttendanceSignals(hotelId: string, userId: string, from: Date, to: Date) {
    const todayRecords = await AttendanceModel.find({
      hotelId,
      userId,
      clockIn: { $gte: from, $lte: to },
    })
      .sort({ clockIn: -1 })
      .lean();

    const latestRecord =
      todayRecords[0] ||
      (await AttendanceModel.findOne({ hotelId, userId })
        .sort({ clockIn: -1 })
        .lean());

    return {
      longHours: todayRecords.some(
        (record) =>
          record.violationFlags?.exceeds10Hours ||
          (record.workDurationMinutes ?? 0) > 600,
      ),
      insufficientRecovery: todayRecords.some(
        (record) => record.violationFlags?.insufficientRecovery,
      ),
      latestWorkDurationMinutes: latestRecord?.workDurationMinutes,
      latestRecoveryMinutes: latestRecord?.recoveryMinutes,
    };
  }

  async upsertDailyEntry(
    hotelId: string,
    userId: string,
    dayStart: Date,
    dayEnd: Date,
    data: Partial<IWellbeing>,
  ) {
    return WellbeingModel.findOneAndUpdate(
      {
        hotelId,
        userId,
        createdAt: { $gte: dayStart, $lte: dayEnd },
      },
      {
        $set: data,
        $setOnInsert: {
          id: `well_${nanoid(10)}`,
          schemaVersion: 1,
          hotelId,
          userId,
        },
      },
      { new: true, upsert: true },
    ).lean();
  }

  async list(hotelId: string, options: WellbeingListOptions = {}) {
    const page = options.page ?? 1;
    const limit = options.limit ?? 25;
    const skip = (page - 1) * limit;

    const query: any = { hotelId };
    if (options.userId) query.userId = options.userId;
    if (options.alertStatus) query.alertStatus = options.alertStatus;
    if (options.fatigueRiskLevel) query.fatigueRiskLevel = options.fatigueRiskLevel;
    if (options.fromDate || options.toDate) {
      query.createdAt = {
        ...(options.fromDate ? { $gte: options.fromDate } : {}),
        ...(options.toDate ? { $lte: options.toDate } : {}),
      };
    }

    const [data, total] = await Promise.all([
      WellbeingModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      WellbeingModel.countDocuments(query),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getById(hotelId: string, id: string) {
    return WellbeingModel.findOne({ hotelId, id }).lean();
  }

  async updateAlertStatus(
    hotelId: string,
    id: string,
    status: "ACKNOWLEDGED" | "RESOLVED",
    actorId?: string,
  ) {
    const now = new Date();
    const update =
      status === "ACKNOWLEDGED"
        ? { alertStatus: status, acknowledgedAt: now, acknowledgedBy: actorId }
        : { alertStatus: status, resolvedAt: now, resolvedBy: actorId };

    return WellbeingModel.findOneAndUpdate(
      { hotelId, id, alertManagers: true },
      { $set: update },
      { new: true },
    ).lean();
  }
}

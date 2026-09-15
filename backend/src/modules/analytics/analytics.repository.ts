import { ApplicationModel } from "../recruitment/application.model";
import { JobModel } from "../recruitment/job.model";
import { HotelModel } from "../hotel/hotel.model";
import { UserModel } from "../users/user.model";
import { AttendanceModel } from "../attendance/attendance.model";
import { WellbeingModel } from "../wellbeing/wellbeing.model";
import { SOSModel } from "../sos/sos.model";
import { CertificateModel } from "../lms/certificate/certificate.model";
import { TaskModel } from "../tasks/task.model";
import { JobStatus } from "../../shared/enums/recruitment";
import { UserRole, UserStatus } from "../../shared/enums/user";
import { TaskStatus } from "../../shared/enums/task";

export class AnalyticsRepository {
  async countHotels(hotelId?: string): Promise<number> {
    const filter: Record<string, unknown> = {};
    if (hotelId) filter.id = hotelId;
    return HotelModel.countDocuments(filter);
  }

  async countActiveEmployees(hotelId?: string): Promise<number> {
    const filter: any = {
      status: UserStatus.ACTIVE,
      role: { $in: [UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.PROFESSIONAL, UserRole.STUDENT] },
    };
    if (hotelId) filter.hotelId = hotelId;
    return UserModel.countDocuments(filter);
  }

  async countActiveManagers(hotelId?: string): Promise<number> {
    const filter: any = {
      status: UserStatus.ACTIVE,
      role: UserRole.MANAGER,
    };
    if (hotelId) filter.hotelId = hotelId;
    return UserModel.countDocuments(filter);
  }

  async countAttendanceToday(hotelId?: string): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const filter: any = {
      clockIn: { $gte: startOfDay, $lt: endOfDay },
    };
    if (hotelId) filter.hotelId = hotelId;

    return AttendanceModel.countDocuments(filter);
  }

  async getComplianceScore(hotelId?: string): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const match: any = {
      clockIn: { $gte: startOfDay, $lt: endOfDay },
    };
    if (hotelId) match.hotelId = hotelId;

    const result = await AttendanceModel.aggregate([
      { $match: match },
      {
        $project: {
          compliant: {
            $cond: [
              {
                $and: [
                  { $eq: ["$geoValidated", true] },
                  { $eq: ["$violationFlags.exceeds10Hours", false] },
                  { $eq: ["$violationFlags.insufficientRecovery", false] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          compliant: { $sum: "$compliant" },
        },
      },
    ]);

    const totals = result[0] || { total: 0, compliant: 0 };
    const total = totals.total as number;
    const compliant = totals.compliant as number;

    if (total === 0) return 100;
    return Math.round((compliant / total) * 100);
  }

  async countFatigueAlerts(hotelId?: string): Promise<number> {
    const filter: any = {
      fatigueScore: { $gte: 70 },
    };
    if (hotelId) filter.hotelId = hotelId;
    return WellbeingModel.countDocuments(filter);
  }

  async countSOSIncidents(hotelId?: string): Promise<number> {
    const filter: any = {
      status: { $in: ["OPEN", "ESCALATED"] },
    };
    if (hotelId) filter.hotelId = hotelId;
    return SOSModel.countDocuments(filter);
  }

  async countOpenJobs(hotelId?: string): Promise<number> {
    const filter: any = { status: JobStatus.OPEN };
    if (hotelId) filter.hotelId = hotelId;
    return JobModel.countDocuments(filter);
  }

  async countNewApplications(hotelId?: string): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const filter: any = {
      appliedAt: { $gte: startOfDay },
    };
    if (hotelId) filter.jobHotelId = hotelId;

    return ApplicationModel.countDocuments(filter);
  }

  async countCertifiedHotels(hotelId?: string): Promise<number> {
    const filter: any = {
      initialPaymentDone: true,
    };
    if (hotelId) filter.id = hotelId;
    return HotelModel.countDocuments(filter);
  }

  async countOnShift(hotelId: string): Promise<number> {
    const filter: any = {
      hotelId,
      clockIn: { $exists: true },
      clockOut: { $exists: false },
    };
    return AttendanceModel.countDocuments(filter);
  }

  async getAttendanceRate(hotelId: string): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const totalEmployees = await UserModel.countDocuments({
      hotelId,
      status: UserStatus.ACTIVE,
      role: { $in: [UserRole.EMPLOYEE, UserRole.MANAGER] },
    });

    const presentToday = await AttendanceModel.countDocuments({
      hotelId,
      clockIn: { $gte: startOfDay, $lt: endOfDay },
    });

    if (totalEmployees === 0) return 0;
    return Math.round((presentToday / totalEmployees) * 100);
  }

  async countActiveSOS(hotelId: string): Promise<number> {
    const filter: any = {
      hotelId,
      status: { $in: ["OPEN", "ESCALATED"] },
    };
    return SOSModel.countDocuments(filter);
  }

  async getAverageOph(hotelId: string): Promise<number> {
    const result = await TaskModel.aggregate([
      {
        $match: {
          hotelId,
          status: TaskStatus.COMPLETED,
          durationMinutes: { $gt: 0 },
        },
      },
      {
        $project: {
          oph: {
            $divide: [
              { $multiply: ["$weight", 60] },
              "$durationMinutes",
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          avgOph: { $avg: "$oph" },
        },
      },
    ]);

    const data = result[0] || { avgOph: 0 };
    return Math.round((data.avgOph ?? 0) * 10) / 10;
  }

  async countPendingTasks(hotelId: string): Promise<number> {
    return TaskModel.countDocuments({
      hotelId,
      status: TaskStatus.PENDING,
    });
  }

  async countCertifiedStaff(hotelId: string): Promise<number> {
    const filter: any = {
      hotelId,
      certificationLevel: { $in: ["MEND_CERTIFIED", "MEND_GOLD_SEAL"] },
    };
    return UserModel.countDocuments(filter);
  }

  async countPendingCertification(hotelId: string): Promise<number> {
    return CertificateModel.countDocuments({
      hotelId,
      status: { $ne: "ACTIVE" },
    });
  }

  async countExpiredCertificates(hotelId: string): Promise<number> {
    const now = new Date();
    return CertificateModel.countDocuments({
      hotelId,
      expiresAt: { $lt: now },
    });
  }

  async getHesViolationCount(hotelId: string): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const filter: any = {
      hotelId,
      clockIn: { $gte: startOfDay, $lt: endOfDay },
      $or: [
        { "violationFlags.exceeds10Hours": true },
        { "violationFlags.insufficientRecovery": true },
      ],
    };
    return AttendanceModel.countDocuments(filter);
  }

  async getWeeklyAttendance(hotelId: string): Promise<Array<{ day: string; present: number; absent: number }>> {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const result: Array<{ day: string; present: number; absent: number }> = [];

    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayOfWeek = date.getDay();
      const dayName = days[(dayOfWeek + 6) % 7];

      const present = await AttendanceModel.countDocuments({
        hotelId,
        clockIn: { $gte: date, $lt: nextDate },
      });

      const totalEmployees = await UserModel.countDocuments({
        hotelId,
        status: UserStatus.ACTIVE,
      });

      const absent = Math.max(0, totalEmployees - present);

      result.push({ day: dayName, present, absent });
    }

    return result;
  }

  async getCertificationStatusBreakdown(hotelId: string): Promise<Record<string, number>> {
    const result = await UserModel.aggregate([
      { $match: { hotelId } },
      {
        $group: {
          _id: "$certificationLevel",
          count: { $sum: 1 },
        },
      },
    ]);

    const breakdown: Record<string, number> = {
      MEND_CERTIFIED: 0,
      MEND_GOLD_SEAL: 0,
      NONE: 0,
    };

    for (const item of result) {
      if (item._id && breakdown.hasOwnProperty(item._id)) {
        breakdown[item._id] = item.count;
      }
    }

    return breakdown;
  }

  async getEfficiencyTrend(hotelId: string): Promise<Array<{ week: string; oph: number }>> {
    const result = await TaskModel.aggregate([
      {
        $match: {
          hotelId,
          status: TaskStatus.COMPLETED,
          completedAt: { $exists: true },
          durationMinutes: { $gt: 0 },
        },
      },
      {
        $project: {
          oph: {
            $divide: [
              { $multiply: ["$weight", 60] },
              "$durationMinutes",
            ],
          },
          week: {
            $week: "$completedAt",
          },
        },
      },
      {
        $group: {
          _id: "$week",
          avgOph: { $avg: "$oph" },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 4 },
    ]);

    return result.map((item, index) => ({
      week: `Week ${item._id}`,
      oph: Math.round((item.avgOph ?? 0) * 10) / 10,
    }));
  }
}

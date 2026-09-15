import { WellbeingRepository } from "./wellbeing.repository";

export interface SubmitWellbeingDto {
  userId: string;
  rating: number;
  sleepHours?: number;
  stressLevel?: number;
}

export class WellbeingService {
  private readonly repo = new WellbeingRepository();

  async submitDaily(hotelId: string, dto: SubmitWellbeingDto) {
    this.validateSubmission(dto);

    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(now);
    dayEnd.setHours(23, 59, 59, 999);

    const attendance = await this.repo.findAttendanceSignals(
      hotelId,
      dto.userId,
      dayStart,
      dayEnd,
    );
    const fatigue = this.calculateFatigue(dto, attendance);

    const entry = await this.repo.upsertDailyEntry(hotelId, dto.userId, dayStart, dayEnd, {
      rating: dto.rating,
      sleepHours: dto.sleepHours,
      stressLevel: dto.stressLevel,
      fatigueScore: fatigue.score,
      fatigueRiskLevel: fatigue.riskLevel,
      fatigueReasons: fatigue.reasons,
      alertManagers: fatigue.alertManagers,
      alertStatus: fatigue.alertManagers ? "OPEN" : "NONE",
      alertedAt: fatigue.alertManagers ? now : undefined,
    });

    return {
      ...entry,
      managerAlertCreated: fatigue.alertManagers,
    };
  }

  async getMyHistory(hotelId: string, userId: string, query: any) {
    return this.repo.list(hotelId, {
      page: this.toPage(query.page),
      limit: this.toLimit(query.limit),
      userId,
      fromDate: this.toDate(query.fromDate),
      toDate: this.toDate(query.toDate),
    });
  }

  async getUserHistory(hotelId: string, userId: string, query: any) {
    return this.getMyHistory(hotelId, userId, query);
  }

  async getFatigueAlerts(hotelId: string, query: any) {
    return this.repo.list(hotelId, {
      page: this.toPage(query.page),
      limit: this.toLimit(query.limit),
      fromDate: this.toDate(query.fromDate),
      toDate: this.toDate(query.toDate),
      userId: typeof query.userId === "string" ? query.userId : undefined,
      alertStatus: typeof query.alertStatus === "string" ? query.alertStatus : "OPEN",
      fatigueRiskLevel:
        typeof query.fatigueRiskLevel === "string" ? query.fatigueRiskLevel : undefined,
    });
  }

  async acknowledgeAlert(hotelId: string, id: string, actorId?: string) {
    const alert = await this.repo.updateAlertStatus(hotelId, id, "ACKNOWLEDGED", actorId);
    if (!alert) {
      throw new Error("Fatigue alert not found");
    }
    return alert;
  }

  async resolveAlert(hotelId: string, id: string, actorId?: string) {
    const alert = await this.repo.updateAlertStatus(hotelId, id, "RESOLVED", actorId);
    if (!alert) {
      throw new Error("Fatigue alert not found");
    }
    return alert;
  }

  async getUsersWithWellbeing(hotelId: string) {
    const users = await this.repo.list(hotelId, {
      page: 1,
      limit: 100,
    });
    return users;
  }

  private validateSubmission(dto: SubmitWellbeingDto) {
    if (!dto.userId) {
      throw new Error("userId is required");
    }
    if (!Number.isInteger(dto.rating) || dto.rating < 1 || dto.rating > 5) {
      throw new Error("rating must be an integer between 1 and 5");
    }
    if (dto.sleepHours !== undefined && (dto.sleepHours < 0 || dto.sleepHours > 24)) {
      throw new Error("sleepHours must be between 0 and 24");
    }
    if (
      dto.stressLevel !== undefined &&
      (!Number.isInteger(dto.stressLevel) || dto.stressLevel < 1 || dto.stressLevel > 5)
    ) {
      throw new Error("stressLevel must be an integer between 1 and 5");
    }
  }

  private calculateFatigue(
    dto: SubmitWellbeingDto,
    attendance: {
      longHours: boolean;
      insufficientRecovery: boolean;
      latestWorkDurationMinutes?: number;
      latestRecoveryMinutes?: number;
    },
  ) {
    let score = 0;
    const reasons: string[] = [];

    if (attendance.longHours) {
      score += 35;
      reasons.push("LONG_HOURS");
    }

    if (attendance.insufficientRecovery) {
      score += 35;
      reasons.push("INSUFFICIENT_RECOVERY");
    }

    if (dto.rating <= 2) {
      score += dto.rating === 1 ? 35 : 25;
      reasons.push("LOW_WELLBEING_SCORE");
    }

    if (dto.sleepHours !== undefined && dto.sleepHours < 6) {
      score += dto.sleepHours < 4 ? 20 : 12;
      reasons.push("LOW_SLEEP");
    }

    if (dto.stressLevel !== undefined && dto.stressLevel >= 4) {
      score += dto.stressLevel === 5 ? 20 : 12;
      reasons.push("HIGH_STRESS");
    }

    score = Math.min(100, score);

    const riskLevel: "LOW" | "MEDIUM" | "HIGH" =
      score >= 70 ? "HIGH" : score >= 35 ? "MEDIUM" : "LOW";

    return {
      score,
      riskLevel,
      reasons,
      alertManagers: riskLevel === "HIGH",
    };
  }

  private toPage(value: unknown) {
    const page = Number(value ?? 1);
    return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  }

  private toLimit(value: unknown) {
    const limit = Number(value ?? 25);
    if (!Number.isFinite(limit) || limit <= 0) return 25;
    return Math.min(Math.floor(limit), 100);
  }

  private toDate(value: unknown) {
    if (typeof value !== "string") return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// modules/tasks/task.service.ts
//
// Implements:
//   FR28 — Manager task assignment
//   FR29 — Task duration tracking
//   FR30 — OPH = Weighted Tasks Completed / Hours Worked
//   FR31 — Efficiency history (daily / weekly)
//   FR32 — Employee performance score (0–100, normalised against hotel average)
//   FR33 — Hotel-level efficiency report (used for strike/flag decisions)
// ─────────────────────────────────────────────────────────────────────────────

import { nanoid } from "nanoid";
import { TaskRepository } from "./task.repository";
import { AppError } from "../../core/middleware/error.middleware";
import { TaskStatus, TaskPriority, TaskType } from "../../shared/enums/task";
import { HotelService } from "../hotel/hotel.service";
import type {
  CreateTaskDto,
  EfficiencyHistoryEntry,
  HotelEfficiencyReportDto,
  ITask,
  TaskListOptions,
  TaskResponseDto,
  UpdateTaskDto,
  UpdateTaskStatusDto,
  UserEfficiencyHistoryDto,
  UserOphDto,
} from "../../shared/interfaces/task.d";
import { Types } from "mongoose";

// ── Constants ─────────────────────────────────────────────────────────────────

const VALID_STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  [TaskStatus.PENDING]: [TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED],
  [TaskStatus.IN_PROGRESS]: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
  [TaskStatus.COMPLETED]: [],
  [TaskStatus.CANCELLED]: [],
};

/** Default look-back window when no dates are supplied */
const DEFAULT_WINDOW_DAYS = 30;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Converts total duration minutes to hours, clamped to a minimum of 1 minute
 * so we never divide by zero.
 */
function minutesToHours(minutes: number): number {
  return Math.max(minutes, 1) / 60;
}

/**
 * Calculates OPH.
 * OPH = weightedTasksCompleted / hoursWorked
 * Returns 0 when there are no completed tasks.
 */
function calculateOph(weightedTasks: number, totalMinutes: number): number {
  if (weightedTasks === 0) return 0;
  const hours = minutesToHours(totalMinutes);
  return Math.round((weightedTasks / hours) * 100) / 100;
}

/**
 * Normalises a raw OPH value against the hotel average to produce a 0–100
 * performance score.
 *
 * Formula:
 *   score = clamp((userOph / hotelAvgOph) * 50, 0, 100)
 *
 * A user performing exactly at the hotel average scores 50.
 * A user at 2× the average scores 100.
 * A user with no tasks scores 0.
 */
function normaliseScore(userOph: number, hotelAvgOph: number): number {
  if (hotelAvgOph === 0 || userOph === 0) return 0;
  const raw = (userOph / hotelAvgOph) * 50;
  return Math.min(Math.round(raw), 100);
}

/**
 * Parses a date window from optional string params.
 * Falls back to the last DEFAULT_WINDOW_DAYS days.
 */
function resolveDateWindow(
  fromDateStr?: string,
  toDateStr?: string,
): { fromDate: Date; toDate: Date } {
  const toDate = toDateStr ? new Date(toDateStr) : new Date();
  const fromDate = fromDateStr
    ? new Date(fromDateStr)
    : new Date(toDate.getTime() - DEFAULT_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    throw new AppError(
      "Invalid date format. Use ISO 8601 (e.g. 2026-01-01).",
      400,
    );
  }

  if (fromDate > toDate) {
    throw new AppError("fromDate must be before toDate.", 400);
  }

  return { fromDate, toDate };
}

// ── Service ───────────────────────────────────────────────────────────────────

export class TaskService {
  private repo = new TaskRepository();
  private hotelService = new HotelService();

  // ── DTO mapper ──────────────────────────────────────────────────────────────

  private toDto(task: ITask): TaskResponseDto {
    return {
      id: task.id,
      hotelId: task.hotelId,
      assignedTo: task.assignedTo,
      assignedBy: task.assignedBy,
      type: task.type,
      priority: task.priority,
      title: task.title,
      description: task.description,
      weight: task.weight,
      status: task.status,
      date: task.date,
      dueTime: task.dueTime,
      startedAt: task.startedAt?.toISOString(),
      completedAt: task.completedAt?.toISOString(),
      durationMinutes: task.durationMinutes,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      taskDetail: task.taskDetail
    };
  }

  // ── Create (FR28) ───────────────────────────────────────────────────────────

  async createTask(
    hotelId: any,
    assignedBy: any,
    taskType: TaskType,
    dto: CreateTaskDto,
  ): Promise<TaskResponseDto> {
    const { assignedTo, title, description, priority, weight, date, dueTime } =
      dto;

    if (!taskType || !title) {
      throw new AppError("assignedTo, type, and title are required.", 400);
    }

    if (
      !Array.isArray(assignedTo) ||
      assignedTo.length === 0 ||
      assignedTo.some((id) => typeof id !== "string" || !id)
    ) {
      throw new AppError(
        "assignedTo must be a non-empty array of user IDs.",
        400,
      );
    }

    if (!title.trim()) {
      throw new AppError("title cannot be blank.", 400);
    }

    const weightValue = weight ?? 5;
    if (weightValue < 1 || weightValue > 10) {
      throw new AppError("weight must be between 1 and 10.", 400);
    }

    const uniqueAssignedTo = Array.from(new Set(assignedTo.map((id) => id)));

    const task = await this.repo.create({
      id: `TSK_${nanoid(10)}`,
      hotelId,
      schemaVersion: 1,
      assignedTo: uniqueAssignedTo,
      assignedBy,
      type: taskType,
      priority: priority ?? TaskPriority.MEDIUM,
      title: title.trim(),
      description: description?.trim(),
      weight: weightValue,
      status: TaskStatus.PENDING,
      isDeleted: false,
      date,
      dueTime,
    });

    return this.toDto(task);
  }

  // ── Read ────────────────────────────────────────────────────────────────────

  async getTaskById(hotelId: string, taskId: string): Promise<TaskResponseDto> {
    const task = await this.repo.findById(hotelId, taskId);
    if (!task) throw new AppError("Task not found.", 404);
    return this.toDto(task);
  }

  async listTasks(
    hotelId: string,
    options: TaskListOptions = {},
  ): Promise<{
    tasks: TaskResponseDto[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 25;

    const { tasks, total } = await this.repo.findWithPagination(hotelId, {
      ...options,
      page,
      limit,
    });

    return {
      tasks: tasks.map((t) => this.toDto(t)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getTasksByAssignee(
    hotelId: string,
    userId: string,
  ): Promise<TaskResponseDto[]> {
    const tasks = await this.repo.findByAssignee(hotelId, userId);
    return tasks.map((t) => this.toDto(t));
  }

  // ── Update ──────────────────────────────────────────────────────────────────

  async updateTask(
    hotelId: string,
    taskId: string,
    dto: UpdateTaskDto,
  ): Promise<TaskResponseDto> {
    const existing = await this.repo.findById(hotelId, taskId);
    if (!existing) throw new AppError("Task not found.", 404);

    if (
      existing.status === TaskStatus.COMPLETED ||
      existing.status === TaskStatus.CANCELLED
    ) {
      throw new AppError(
        `Cannot update a task that is already ${existing.status.toLowerCase()}.`,
        400,
      );
    }

    const updatePayload: Partial<ITask> = {};
    if (dto.type !== undefined) updatePayload.type = dto.type;
    if (dto.priority !== undefined) updatePayload.priority = dto.priority;
    if (dto.title !== undefined) {
      if (!dto.title.trim()) throw new AppError("title cannot be blank.", 400);
      updatePayload.title = dto.title.trim();
    }

    if (dto.dueTime !== undefined) {
      updatePayload.dueTime = dto.dueTime.trim();
    }
    if (dto.description !== undefined)
      updatePayload.description = dto.description.trim();
    if (dto.assignedTo !== undefined) {
      if (
        !Array.isArray(dto.assignedTo) ||
        dto.assignedTo.length === 0 ||
        dto.assignedTo.some((id) => typeof id !== "string" || !id)
      ) {
        throw new AppError(
          "assignedTo must be a non-empty array of user IDs.",
          400,
        );
      }
      updatePayload.assignedTo = Array.from(
        new Set(dto.assignedTo.map((id) => id)),
      );
    }
    if (dto.weight !== undefined) {
      if (dto.weight < 1 || dto.weight > 10)
        throw new AppError("weight must be between 1 and 10.", 400);
      updatePayload.weight = dto.weight;
    }

    const updated = await this.repo.update(hotelId, taskId, updatePayload);
    if (!updated) throw new AppError("Task not found.", 404);

    return this.toDto(updated);
  }

  // ── Status transitions (FR29) ───────────────────────────────────────────────

  async updateTaskStatus(
    hotelId: string,
    userId: string,
    taskId: string,
    dto: UpdateTaskStatusDto,
  ): Promise<TaskResponseDto> {

    const task = await this.repo.findById(hotelId, taskId);

    if (!task) {
      throw new AppError("Task not found.", 404);
    }

    const employeeExists = await this.repo.checkUserExistance(taskId, userId);

    if (!employeeExists) {
      throw new AppError("You are not assigned to this task.", 403);
    }

    const currentStatus = task.status as TaskStatus;
    const allowedNext = VALID_STATUS_TRANSITIONS[currentStatus] ?? [];

    // if (!allowedNext.includes(dto.status)) {
    //   throw new AppError(
    //     `Invalid status transition: ${currentStatus} → \${dto.status}`,
    //     400,
    //   );
    // }

    // ---------------------------------------------------------------------------
    // Ensure every assigned employee has a taskData record
    // ---------------------------------------------------------------------------
    const taskData = (task.taskDetail?.taskData ?? []).map((item) => ({
      userId: item.userId,
      photos: [...(item.photos ?? [])],
      completed: item.completed,
      status: item.status,
      completedAt: item.completedAt,
    }));

    for (const assignedUserId of task.assignedTo) {
      const exists = taskData.some(
        (x) => x.userId.toString() === assignedUserId.toString(),
      );

      if (!exists) {
        taskData.push({
          userId: assignedUserId,
          photos: [],
          status: TaskStatus.PENDING,
          completed: 0,
          completedAt: undefined,
        });
      }
    }

    // ---------------------------------------------------------------------------
    // Update current employee
    // ---------------------------------------------------------------------------
    const employeeIndex = taskData.findIndex(
      (x) => x.userId.toString() === userId,
    );

    if (employeeIndex === -1) {
      throw new AppError("Employee task record not found.", 400);
    }
    taskData[employeeIndex] = {
      ...taskData[employeeIndex],
      photos: dto.photos ?? taskData[employeeIndex].photos,
      status: dto.status,
      completed: dto.status === TaskStatus.COMPLETED ? 1 : 0,
      completedAt: dto.status === TaskStatus.COMPLETED ? new Date() : undefined,
    };

    // ---------------------------------------------------------------------------
    // Calculate progress
    // ---------------------------------------------------------------------------
    const completedCount = taskData.filter(
      (x) => x.status === TaskStatus.COMPLETED,
    ).length;

    const totalEmployees = task.assignedTo.length;

    const progress =
      totalEmployees === 0
        ? 0
        : Math.round((completedCount / totalEmployees) * 100);

    // ---------------------------------------------------------------------------
    // Determine overall task status
    // ---------------------------------------------------------------------------
    let overallStatus: TaskStatus = TaskStatus.PENDING;

    if (completedCount === totalEmployees) {
      overallStatus = TaskStatus.COMPLETED;
    } else if (
      taskData.some(
        (x) =>
          x.status === TaskStatus.IN_PROGRESS ||
          x.status === TaskStatus.COMPLETED,
      )
    ) {
      overallStatus = TaskStatus.IN_PROGRESS;
    }

    // ---------------------------------------------------------------------------
    // Build update payload
    // ---------------------------------------------------------------------------
    const updatePayload: Partial<ITask> = {
      status: overallStatus,
      taskDetail: {
        taskData,
        progress,
      },
    };

    // Set startedAt only once (first time task enters IN_PROGRESS)
    if (overallStatus === TaskStatus.IN_PROGRESS && !task.startedAt) {
      updatePayload.startedAt = new Date();
    }

    // Set completedAt and duration only when everyone completes
    if (overallStatus === TaskStatus.COMPLETED) {
      const completedAt = new Date();

      updatePayload.completedAt = completedAt;

      if (task.startedAt) {
        const durationMs = completedAt.getTime() - task.startedAt.getTime();

        updatePayload.durationMinutes = Math.max(
          Math.round(durationMs / 60000),
          0,
        );
      }
    }

    // ---------------------------------------------------------------------------
    // Persist
    // ---------------------------------------------------------------------------

    const updated = await this.repo.update(hotelId, taskId, updatePayload);

    if (!updated) {
      throw new AppError("Task not found.", 404);
    }

    return this.toDto(updated);
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  async deleteTask(hotelId: string, taskId: string): Promise<void> {
    const task = await this.repo.findById(hotelId, taskId);
    if (!task) throw new AppError("Task not found.", 404);

    if (task.status === TaskStatus.IN_PROGRESS) {
      throw new AppError(
        "Cannot delete a task that is currently in progress.",
        400,
      );
    }

    await this.repo.softDelete(hotelId, taskId);
  }

  // ── Basic summary ───────────────────────────────────────────────────────────

  async getTaskSummary(hotelId: string): Promise<{
    countByStatus: { status: string; count: number }[];
    avgDurationByType: { type: string; avgDuration: number }[];
  }> {
    const [countByStatus, avgDurationByType] = await Promise.all([
      this.repo.countByStatus(hotelId),
      this.repo.averageDurationByType(hotelId),
    ]);

    return { countByStatus, avgDurationByType };
  }

  // ── OPH for a single user (FR30) ────────────────────────────────────────────

  async getUserOph(
    hotelId: string,
    userId: string,
    fromDateStr?: string,
    toDateStr?: string,
  ): Promise<UserOphDto> {
    const { fromDate, toDate } = resolveDateWindow(fromDateStr, toDateStr);

    const metrics = await this.repo.getUserTaskMetrics(
      hotelId,
      userId,
      fromDate,
      toDate,
    );

    const oph = calculateOph(
      metrics.weightedTasksCompleted,
      metrics.totalDurationMinutes,
    );

    // To normalise the score we need the hotel average OPH
    const hotelMetrics = await this.repo.getHotelUserMetrics(
      hotelId,
      fromDate,
      toDate,
    );

    const hotelAvgOph = this.computeHotelAverageOph(hotelMetrics);
    const performanceScore = normaliseScore(oph, hotelAvgOph);

    return {
      userId,
      hotelId,
      weightedTasksCompleted: metrics.weightedTasksCompleted,
      totalHoursWorked:
        Math.round((metrics.totalDurationMinutes / 60) * 100) / 100,
      oph,
      performanceScore,
      completedTaskCount: metrics.completedTaskCount,
      cancelledTaskCount: metrics.cancelledTaskCount,
      avgDurationMinutes: metrics.avgDurationMinutes,
      fromDate: fromDate.toISOString(),
      toDate: toDate.toISOString(),
    };
  }

  // ── Efficiency history for a user (FR31) ────────────────────────────────────

  async getUserEfficiencyHistory(
    hotelId: string,
    userId: string,
    granularity: "daily" | "weekly",
    fromDateStr?: string,
    toDateStr?: string,
  ): Promise<UserEfficiencyHistoryDto> {
    const { fromDate, toDate } = resolveDateWindow(fromDateStr, toDateStr);

    const periods = await this.repo.getUserTaskMetricsByPeriod(
      hotelId,
      userId,
      fromDate,
      toDate,
      granularity,
    );

    // Compute hotel average OPH for the whole window (used for normalisation)
    const hotelMetrics = await this.repo.getHotelUserMetrics(
      hotelId,
      fromDate,
      toDate,
    );
    const hotelAvgOph = this.computeHotelAverageOph(hotelMetrics);

    const periodDurationMs =
      granularity === "daily" ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;

    const history: EfficiencyHistoryEntry[] = periods.map((p) => {
      const oph = calculateOph(
        p.weightedTasksCompleted,
        p.totalDurationMinutes,
      );
      const periodEnd = new Date(
        p.periodStart.getTime() + periodDurationMs - 1,
      );

      return {
        periodStart: p.periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        oph,
        performanceScore: normaliseScore(oph, hotelAvgOph),
        completedTaskCount: p.completedTaskCount,
        weightedTasksCompleted: p.weightedTasksCompleted,
        totalHoursWorked: Math.round((p.totalDurationMinutes / 60) * 100) / 100,
      };
    });

    return { userId, hotelId, granularity, history };
  }

  // ── Hotel-level efficiency report (FR32, FR33) ──────────────────────────────

  async getHotelEfficiencyReport(
    hotelId: string,
    fromDateStr?: string,
    toDateStr?: string,
  ): Promise<HotelEfficiencyReportDto> {
    const { fromDate, toDate } = resolveDateWindow(fromDateStr, toDateStr);

    const [userMetrics, totals, countByStatus, avgDurationByType] =
      await Promise.all([
        this.repo.getHotelUserMetrics(hotelId, fromDate, toDate),
        this.repo.getHotelTaskTotals(hotelId, fromDate, toDate),
        this.repo.countByStatus(hotelId),
        this.repo.averageDurationByType(hotelId),
      ]);

    const hotelAvgOph = this.computeHotelAverageOph(userMetrics);

    // Build leaderboard — sorted by OPH descending
    const leaderboard = userMetrics
      .map((u) => {
        const oph = calculateOph(
          u.weightedTasksCompleted,
          u.totalDurationMinutes,
        );
        return {
          userId: u.userId,
          oph,
          performanceScore: normaliseScore(oph, hotelAvgOph),
          completedTaskCount: u.completedTaskCount,
          rank: 0, // filled below
        };
      })
      .sort((a, b) => b.oph - a.oph)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    const hotelAvgPerformanceScore =
      leaderboard.length > 0
        ? Math.round(
            leaderboard.reduce((sum, e) => sum + e.performanceScore, 0) /
              leaderboard.length,
          )
        : 0;

    return {
      hotelId,
      fromDate: fromDate.toISOString(),
      toDate: toDate.toISOString(),
      hotelAverageOph: Math.round(hotelAvgOph * 100) / 100,
      hotelAveragePerformanceScore: hotelAvgPerformanceScore,
      totalTasksCompleted: totals.totalCompleted,
      totalTasksCancelled: totals.totalCancelled,
      leaderboard,
      countByStatus,
      avgDurationByType,
    };
  }

  async evaluateHotelPerformanceFlag(
    hotelId: string,
    options: {
      fromDate?: string;
      toDate?: string;
      threshold?: number;
      applyStrike?: boolean;
      evaluatedBy?: string;
    } = {},
  ) {
    const threshold = options.threshold ?? 35;
    if (threshold < 0 || threshold > 100) {
      throw new AppError("threshold must be between 0 and 100.", 400);
    }

    const report = await this.getHotelEfficiencyReport(
      hotelId,
      options.fromDate,
      options.toDate,
    );

    const shouldFlag = report.hotelAveragePerformanceScore < threshold;
    const reason = shouldFlag
      ? `Hotel average performance score ${report.hotelAveragePerformanceScore} is below threshold ${threshold}.`
      : `Hotel average performance score ${report.hotelAveragePerformanceScore} meets threshold ${threshold}.`;

    let hotel: unknown = null;
    if (shouldFlag && options.applyStrike !== false) {
      hotel = await this.hotelService.strikeHotel(
        hotelId,
        reason,
        options.evaluatedBy,
      );
    }

    return {
      hotelId,
      shouldFlag,
      strikeApplied: shouldFlag && options.applyStrike !== false,
      threshold,
      reason,
      report,
      hotel,
    };
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private computeHotelAverageOph(
    userMetrics: {
      weightedTasksCompleted: number;
      totalDurationMinutes: number;
    }[],
  ): number {
    if (userMetrics.length === 0) return 0;

    const totalWeighted = userMetrics.reduce(
      (sum, u) => sum + u.weightedTasksCompleted,
      0,
    );
    const totalMinutes = userMetrics.reduce(
      (sum, u) => sum + u.totalDurationMinutes,
      0,
    );

    return calculateOph(totalWeighted, totalMinutes);
  }
}

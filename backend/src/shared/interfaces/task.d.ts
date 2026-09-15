// ─────────────────────────────────────────────────────────────────────────────
// shared/interfaces/task.d.ts
// ─────────────────────────────────────────────────────────────────────────────

import { Types } from "mongoose";
import { IBaseDocument } from "./base.types";
import { TaskPriority, TaskStatus, TaskType } from "../enums/task";

export interface ITask extends IBaseDocument {
   assignedTo: Types.ObjectId[];
  assignedBy: Types.ObjectId;
  type: TaskType;
  priority: TaskPriority;
  title: string;
  description?: string;
  weight: number;
  status: TaskStatus;
  startedAt?: Date;
  completedAt?: Date;
  date: String;
  dueTime: String;
  durationMinutes?: number;
  /** Soft-delete flag — tasks are never hard-deleted */
  isDeleted: boolean;
  taskDetail? : TaskDetail
}

export interface TaskDetail {
  taskData : TaskData[];
  progress?: number;
}

export interface TaskData {
  userId:Types.ObjectId;
  photos?:string[],
  completed: number,
  status: TaskStatus, 
  completedAt?: Date
}

// ── Request / Response DTOs ───────────────────────────────────────────────────

export interface CreateTaskDto {
  assignedTo: Types.ObjectId[];
  type: TaskType;
  priority?: TaskPriority;
  title: string;
  date: string;
  dueTime: String;
  description?: string;
  /** Relative importance weighting for analytics (1–10). Default: 5 */
  weight?: number;
}

export interface UpdateTaskDto {
  type?: TaskType;
  priority?: TaskPriority;
  title?: string;
  description?: string;
  weight?: number;
  dueTime?: string;
  assignedTo?: Types.ObjectId[];
}

export interface UpdateTaskStatusDto {
  status: TaskStatus;
  photos : string[]
}

export interface TaskResponseDto {
  id: string;
  hotelId: Types.ObjectId;
  assignedTo: Types.ObjectId[];
  assignedBy: Types.ObjectId;
  date: String;
  dueTime: String;
  type: TaskType;
  priority: TaskPriority;
  title: string;
  description?: string;
  weight: number;
  status: TaskStatus;
  startedAt?: string;
  completedAt?: string;
  durationMinutes?: number;
  createdAt: string;
  updatedAt: string;
  taskDetail? : TaskDetail
}

export interface TaskListOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  filters?: TaskListFilters;
}

export interface TaskListFilters {
  status?: TaskStatus;
  type?: TaskType;
  priority?: TaskPriority;
  assignedTo?: string | string[];
  assignedBy?: string;
  search?: string;
  /** ISO date string — filter tasks created on or after this date */
  fromDate?: string;
  /** ISO date string — filter tasks created on or before this date */
  toDate?: string;
}

// ── OPH / Efficiency DTOs (FR30–FR32) ────────────────────────────────────────

/**
 * Output-Per-Hour score for a single user over a time window.
 * OPH = sum(weight * 1 per completed task) / totalHoursWorked
 */
export interface UserOphDto {
  userId: string;
  hotelId: string;
  /** Total weighted tasks completed in the window */
  weightedTasksCompleted: number;
  /** Total hours worked derived from completed task durations */
  totalHoursWorked: number;
  /** OPH = weightedTasksCompleted / totalHoursWorked (0 when no hours logged) */
  oph: number;
  /** Normalised 0–100 performance score derived from OPH relative to hotel average */
  performanceScore: number;
  /** Number of completed tasks in the window */
  completedTaskCount: number;
  /** Number of cancelled tasks in the window */
  cancelledTaskCount: number;
  /** Average task duration in minutes (completed tasks only) */
  avgDurationMinutes: number;
  fromDate: string;
  toDate: string;
}

/** One entry in a user's efficiency history (daily/weekly snapshot) */
export interface EfficiencyHistoryEntry {
  periodStart: string;
  periodEnd: string;
  oph: number;
  performanceScore: number;
  completedTaskCount: number;
  weightedTasksCompleted: number;
  totalHoursWorked: number;
}

export interface UserEfficiencyHistoryDto {
  userId: string;
  hotelId: string;
  granularity: "daily" | "weekly";
  history: EfficiencyHistoryEntry[];
}

/** Hotel-level leaderboard entry */
export interface EfficiencyLeaderboardEntry {
  userId: string;
  oph: number;
  performanceScore: number;
  completedTaskCount: number;
  rank: number;
}

export interface HotelEfficiencyReportDto {
  hotelId: string;
  fromDate: string;
  toDate: string;
  hotelAverageOph: number;
  hotelAveragePerformanceScore: number;
  totalTasksCompleted: number;
  totalTasksCancelled: number;
  leaderboard: EfficiencyLeaderboardEntry[];
  countByStatus: { status: string; count: number }[];
  avgDurationByType: { type: string; avgDuration: number }[];
}

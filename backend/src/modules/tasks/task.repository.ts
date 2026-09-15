// ─────────────────────────────────────────────────────────────────────────────
// modules/tasks/task.repository.ts
// ─────────────────────────────────────────────────────────────────────────────

import { TaskModel } from "./task.model";
import { ITask, TaskListOptions } from "../../shared/interfaces/task.d";
import { TaskStatus } from "../../shared/enums/task";

export class TaskRepository {
  // ── Write operations ────────────────────────────────────────────────────────

  async create(data: Partial<ITask>): Promise<ITask> {
    return TaskModel.create(data);
  }

  async update(
    hotelId: string,
    taskId: string,
    data: Partial<ITask>,
  ): Promise<ITask | null> {
    return TaskModel.findOneAndUpdate(
      { hotelId, id: taskId, isDeleted: false },
      { $set: data },
      {
        returnDocument: "after",
      },
    );
  }

  /**
   * Soft-delete — tasks are never hard-deleted so audit trails are preserved.
   */
  async softDelete(hotelId: string, taskId: string): Promise<ITask | null> {
    return TaskModel.findOneAndUpdate(
      { hotelId, id: taskId, isDeleted: false },
      { isDeleted: true },
      { new: true },
    );
  }

  // ── Read operations ─────────────────────────────────────────────────────────

  async findById(hotelId: string, taskId: string): Promise<ITask | null> {
    return TaskModel.findOne({ hotelId, id: taskId, isDeleted: false });
  }

  async checkUserExistance(taskId: string, userId: string): Promise<boolean> {
    const userExists = await TaskModel.findOne({
      id: taskId,
      assignedTo: userId,
    });

    return !!userExists;
  }

  async findWithPagination(
    hotelId: string,
    options: TaskListOptions = {},
  ): Promise<{ tasks: ITask[]; total: number }> {
    const {
      page = 1,
      limit = 25,
      sortBy = "createdAt",
      sortOrder = "desc",
      filters = {},
    } = options;

    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { hotelId, isDeleted: false };

    if (filters.status) query.status = filters.status;
    if (filters.type) query.type = filters.type;
    if (filters.priority) query.priority = filters.priority;
    if (filters.assignedTo) {
      if (Array.isArray(filters.assignedTo)) {
        query.assignedTo = { $in: filters.assignedTo };
      } else {
        query.assignedTo = filters.assignedTo;
      }
    }
    if (filters.assignedBy) query.assignedBy = filters.assignedBy;

    // Date range filter on createdAt
    if (filters.fromDate || filters.toDate) {
      const dateFilter: Record<string, Date> = {};
      if (filters.fromDate) dateFilter.$gte = new Date(filters.fromDate);
      if (filters.toDate) {
        const to = new Date(filters.toDate);
        to.setHours(23, 59, 59, 999);
        dateFilter.$lte = to;
      }
      query.createdAt = dateFilter;
    }

    if (filters.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: "i" } },
        { description: { $regex: filters.search, $options: "i" } },
      ];
    }

    const sort: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === "desc" ? -1 : 1,
    };

    const [tasks, total] = await Promise.all([
      TaskModel.find(query).populate({
          path: "taskDetail.taskData.userId",
          select : "profile.firstName profile.lastName",
          strictPopulate : false,
      }).sort(sort).skip(skip).limit(limit),
      TaskModel.countDocuments(query),
    ]);


    return { tasks: tasks as ITask[], total };
  }

  async findByAssignee(hotelId: string, userId: string): Promise<ITask[]> {
    return TaskModel.find({
      hotelId,
      assignedTo: userId,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .lean() as Promise<ITask[]>;
  }

  // ── Analytics helpers ───────────────────────────────────────────────────────

  async countByStatus(
    hotelId: string,
  ): Promise<{ status: string; count: number }[]> {
    return TaskModel.aggregate([
      { $match: { hotelId, isDeleted: false } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $project: { _id: 0, status: "$_id", count: 1 } },
    ]);
  }

  async averageDurationByType(
    hotelId: string,
  ): Promise<{ type: string; avgDuration: number }[]> {
    return TaskModel.aggregate([
      {
        $match: {
          hotelId,
          isDeleted: false,
          status: TaskStatus.COMPLETED,
          durationMinutes: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: "$type",
          avgDuration: { $avg: "$durationMinutes" },
        },
      },
      {
        $project: {
          _id: 0,
          type: "$_id",
          avgDuration: { $round: ["$avgDuration", 1] },
        },
      },
    ]);
  }

  /**
   * Aggregates OPH metrics for a single user within a date window.
   * Returns raw aggregation data; OPH calculation is done in the service.
   */
  async getUserTaskMetrics(
    hotelId: string,
    userId: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<{
    weightedTasksCompleted: number;
    totalDurationMinutes: number;
    completedTaskCount: number;
    cancelledTaskCount: number;
    avgDurationMinutes: number;
  }> {
    const endOfDay = new Date(toDate);
    endOfDay.setHours(23, 59, 59, 999);

    const [completedResult, cancelledResult] = await Promise.all([
      TaskModel.aggregate([
        {
          $match: {
            hotelId,
            assignedTo: userId,
            isDeleted: false,
            status: TaskStatus.COMPLETED,
            completedAt: { $gte: fromDate, $lte: endOfDay },
          },
        },
        {
          $group: {
            _id: null,
            weightedTasksCompleted: { $sum: "$weight" },
            totalDurationMinutes: {
              $sum: { $ifNull: ["$durationMinutes", 0] },
            },
            completedTaskCount: { $sum: 1 },
            avgDurationMinutes: { $avg: { $ifNull: ["$durationMinutes", 0] } },
          },
        },
      ]),
      TaskModel.countDocuments({
        hotelId,
        assignedTo: userId,
        isDeleted: false,
        status: TaskStatus.CANCELLED,
        updatedAt: { $gte: fromDate, $lte: endOfDay },
      }),
    ]);

    const completed = completedResult[0] ?? {
      weightedTasksCompleted: 0,
      totalDurationMinutes: 0,
      completedTaskCount: 0,
      avgDurationMinutes: 0,
    };

    return {
      weightedTasksCompleted: completed.weightedTasksCompleted,
      totalDurationMinutes: completed.totalDurationMinutes,
      completedTaskCount: completed.completedTaskCount,
      cancelledTaskCount: cancelledResult,
      avgDurationMinutes:
        Math.round((completed.avgDurationMinutes ?? 0) * 10) / 10,
    };
  }

  /**
   * Returns per-user OPH metrics for all users in a hotel within a date window.
   * Used for leaderboard and hotel-level efficiency report.
   */
  async getHotelUserMetrics(
    hotelId: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<
    {
      userId: string;
      weightedTasksCompleted: number;
      totalDurationMinutes: number;
      completedTaskCount: number;
    }[]
  > {
    const endOfDay = new Date(toDate);
    endOfDay.setHours(23, 59, 59, 999);

    return TaskModel.aggregate([
      {
        $match: {
          hotelId,
          isDeleted: false,
          status: TaskStatus.COMPLETED,
          completedAt: { $gte: fromDate, $lte: endOfDay },
        },
      },
      {
        $unwind: "$assignedTo"
      },
      {
        $group: {
          _id: "$assignedTo",
          weightedTasksCompleted: { $sum: "$weight" },
          totalDurationMinutes: {
            $sum: { $ifNull: ["$durationMinutes", 0] },
          },
          completedTaskCount: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          userId: "$_id",
          weightedTasksCompleted: 1,
          totalDurationMinutes: 1,
          completedTaskCount: 1,
        },
      },
      { $sort: { weightedTasksCompleted: -1 } },
    ]);
  }

  /**
   * Returns daily or weekly task metrics for a user — used for efficiency history.
   */
  async getUserTaskMetricsByPeriod(
    hotelId: string,
    userId: string,
    fromDate: Date,
    toDate: Date,
    granularity: "daily" | "weekly",
  ): Promise<
    {
      periodStart: Date;
      weightedTasksCompleted: number;
      totalDurationMinutes: number;
      completedTaskCount: number;
    }[]
  > {
    const endOfDay = new Date(toDate);
    endOfDay.setHours(23, 59, 59, 999);

    // MongoDB date truncation expression
    const dateTrunc =
      granularity === "daily"
        ? {
            $dateTrunc: {
              date: "$completedAt",
              unit: "day",
            },
          }
        : {
            $dateTrunc: {
              date: "$completedAt",
              unit: "week",
              startOfWeek: "monday",
            },
          };

    return TaskModel.aggregate([
      {
        $match: {
          hotelId,
          assignedTo: userId,
          isDeleted: false,
          status: TaskStatus.COMPLETED,
          completedAt: { $gte: fromDate, $lte: endOfDay },
        },
      },
      {
        $group: {
          _id: dateTrunc,
          weightedTasksCompleted: { $sum: "$weight" },
          totalDurationMinutes: {
            $sum: { $ifNull: ["$durationMinutes", 0] },
          },
          completedTaskCount: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          periodStart: "$_id",
          weightedTasksCompleted: 1,
          totalDurationMinutes: 1,
          completedTaskCount: 1,
        },
      },
      { $sort: { periodStart: 1 } },
    ]);
  }

  /**
   * Total completed and cancelled tasks for a hotel in a date window.
   * Used for hotel-level report header stats.
   */
  async getHotelTaskTotals(
    hotelId: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<{ totalCompleted: number; totalCancelled: number }> {
    const endOfDay = new Date(toDate);
    endOfDay.setHours(23, 59, 59, 999);

    const [completed, cancelled] = await Promise.all([
      TaskModel.countDocuments({
        hotelId,
        isDeleted: false,
        status: TaskStatus.COMPLETED,
        completedAt: { $gte: fromDate, $lte: endOfDay },
      }),
      TaskModel.countDocuments({
        hotelId,
        isDeleted: false,
        status: TaskStatus.CANCELLED,
        updatedAt: { $gte: fromDate, $lte: endOfDay },
      }),
    ]);

    return { totalCompleted: completed, totalCancelled: cancelled };
  }
}

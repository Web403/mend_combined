// ─────────────────────────────────────────────────────────────────────────────
// modules/tasks/task.controller.ts
// ─────────────────────────────────────────────────────────────────────────────

import { Response } from "express";
import { TaskService } from "./task.service";
import { successResponse, errorResponse } from "../../core/utils/ApiResponse";
import { AuthenticatedRequest } from "../../core/middleware/auth.middleware";
import { TaskPriority, TaskStatus, TaskType } from "../../shared/enums/task";
import { TaskListOptions } from "../../shared/interfaces/task.d";
import { StorageFactory } from "../../shared/services/storage/storage.factory";

// Narrows Express query values to plain string | undefined
const qs = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

const qsOrArray = (value: unknown): string | string[] | undefined => {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.every((v) => typeof v === "string")) return value as string[];
  return undefined;
};

const service = new TaskService();
const storage = StorageFactory.create();

export class TaskController {
  // ── POST /tasks ─────────────────────────────────────────────────────────────

  async createTask(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const hotelId = req.user?.hotelId as string;
      const taskType = req.user?.departmentType as TaskType;
      const assignedBy = req.user?.id as string;
      const task = await service.createTask(
        hotelId,
        assignedBy,
        taskType,
        req.body,
      );
      res.status(201).json(successResponse(task, "Task created successfully"));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }

  // ── GET /tasks/:id ──────────────────────────────────────────────────────────

  async getTaskById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const hotelId = (req as any).hotelId as string;
      const id = req.params["id"] as string;
      if (!id) {
        res.status(400).json(errorResponse("Invalid task id"));
        return;
      }

      const task = await service.getTaskById(hotelId, id);
      res.json(successResponse(task));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }

  // ── GET /tasks ──────────────────────────────────────────────────────────────

  async listTasks(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const hotelId = (req.user?.hotelId as string) || (req as any).hotelId as string || (req.query.hotelId as string) || (req.user?.id as string);
      const taskType = req.user?.departmentType;

      const page = parseInt(qs(req.query.page) ?? "1", 10);
      const limit = Math.min(parseInt(qs(req.query.limit) ?? "25", 10), 100);
      const sortBy = qs(req.query.sortBy) ?? "createdAt";
      const sortOrder = (qs(req.query.sortOrder) ?? "desc") as "asc" | "desc";

      const statusRaw = qs(req.query.status);
      const status =
        statusRaw && Object.values(TaskStatus).includes(statusRaw as TaskStatus)
          ? (statusRaw as TaskStatus)
          : undefined;

      // const type =
      //   taskType && Object.values(TaskType).includes(taskType as TaskType)
      //     ? (taskType as TaskType)
      //     : undefined;

      const type = taskType as TaskType;

      const priorityRaw = qs(req.query.priority);
      const priority =
        priorityRaw &&
        Object.values(TaskPriority).includes(priorityRaw as TaskPriority)
          ? (priorityRaw as TaskPriority)
          : undefined;

      const options: TaskListOptions = {
        page,
        limit,
        sortBy,
        sortOrder,
        filters: {
          ...(status && { status }),
          ...(type && { type }),
          ...(priority && { priority }),
          ...(qs(req.query.assignedTo) && {
            assignedTo: qs(req.query.assignedTo),
          }),
          ...(qs(req.query.assignedBy) && {
            assignedBy: qs(req.query.assignedBy),
          }),
          ...(qs(req.query.search) && { search: qs(req.query.search) }),
          ...(qs(req.query.fromDate) && { fromDate: qs(req.query.fromDate) }),
          ...(qs(req.query.toDate) && { toDate: qs(req.query.toDate) }),
        },
      };

      const result = await service.listTasks(hotelId, options);
      res.json(
        successResponse(
          result.tasks,
          "Tasks retrieved successfully",
          result.pagination,
        ),
      );
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }

  // ── GET /tasks/user/:userId ─────────────────────────────────────────────────

  async getTasksByAssignee(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const hotelId = (req as any).hotelId as string;
      const userId = req.params["userId"] as string;
      if (!userId) {
        res.status(400).json(errorResponse("Invalid userId"));
        return;
      }

      const tasks = await service.getTasksByAssignee(hotelId, userId);
      res.json(successResponse(tasks, "User tasks retrieved successfully"));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }

  // ── PUT /tasks/:id ──────────────────────────────────────────────────────────

  async updateTask(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const hotelId = (req as any).hotelId as string;
      const id = req.params["id"] as string;
      if (!id) {
        res.status(400).json(errorResponse("Invalid task id"));
        return;
      }

      const task = await service.updateTask(hotelId, id, req.body);
      res.json(successResponse(task, "Task updated successfully"));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }

  // ── PATCH /tasks/:id/status ─────────────────────────────────────────────────

  async updateTaskStatus(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const hotelId = req.user?.hotelId as string;
      const userId = req.user?.id as string;
      const id = req.params["id"] as string;
      if (!id) {
        res.status(400).json(errorResponse("Invalid task id"));
        return;
      }

      const files = (req.files as Express.Multer.File[]) ?? [];

      let photoUrls: string[] = [];

      if(files.length > 0) {
        photoUrls = await storage.uploadMany(files,"tasks");
      }


      const dto = {
      ...req.body,
      photos: photoUrls,
    };

      const task = await service.updateTaskStatus(hotelId, userId, id, dto);
      res.json(successResponse(task, "Task status updated successfully"));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }

  // ── DELETE /tasks/:id ───────────────────────────────────────────────────────

  async deleteTask(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const hotelId = (req as any).hotelId as string;
      const id = req.params["id"] as string;
      if (!id) {
        res.status(400).json(errorResponse("Invalid task id"));
        return;
      }

      await service.deleteTask(hotelId, id);
      res.json(successResponse(null, "Task deleted successfully"));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }

  // ── GET /tasks/summary ──────────────────────────────────────────────────────

  async getTaskSummary(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const hotelId = (req as any).hotelId as string;
      const summary = await service.getTaskSummary(hotelId);
      res.json(successResponse(summary, "Task summary retrieved successfully"));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }

  // ── GET /tasks/efficiency/user/:userId  (FR30, FR32) ────────────────────────

  async getUserOph(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const hotelId = (req as any).hotelId as string;
      const userId = req.params["userId"] as string;
      if (!userId) {
        res.status(400).json(errorResponse("Invalid userId"));
        return;
      }

      const fromDate = qs(req.query.fromDate);
      const toDate = qs(req.query.toDate);

      const result = await service.getUserOph(
        hotelId,
        userId,
        fromDate,
        toDate,
      );
      res.json(successResponse(result, "User OPH retrieved successfully"));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }

  // ── GET /tasks/efficiency/user/:userId/history  (FR31) ──────────────────────

  async getUserEfficiencyHistory(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const hotelId = (req as any).hotelId as string;
      const userId = req.params["userId"] as string;
      if (!userId) {
        res.status(400).json(errorResponse("Invalid userId"));
        return;
      }

      const granularityRaw = qs(req.query.granularity) ?? "daily";
      if (granularityRaw !== "daily" && granularityRaw !== "weekly") {
        res
          .status(400)
          .json(errorResponse("granularity must be 'daily' or 'weekly'"));
        return;
      }

      const fromDate = qs(req.query.fromDate);
      const toDate = qs(req.query.toDate);

      const result = await service.getUserEfficiencyHistory(
        hotelId,
        userId,
        granularityRaw,
        fromDate,
        toDate,
      );
      res.json(
        successResponse(result, "Efficiency history retrieved successfully"),
      );
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }

  // ── GET /tasks/efficiency/hotel  (FR32, FR33) ────────────────────────────────

  async getHotelEfficiencyReport(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const hotelId = (req as any).hotelId as string;
      const fromDate = qs(req.query.fromDate);
      const toDate = qs(req.query.toDate);

      const result = await service.getHotelEfficiencyReport(
        hotelId,
        fromDate,
        toDate,
      );
      res.json(
        successResponse(
          result,
          "Hotel efficiency report retrieved successfully",
        ),
      );
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }

  // ── POST /tasks/efficiency/hotel/flag  (FR33) ─────────────────────────────

  async evaluateHotelPerformanceFlag(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const hotelId = (req as any).hotelId as string;
      const fromDate = qs(req.body.fromDate) ?? qs(req.query.fromDate);
      const toDate = qs(req.body.toDate) ?? qs(req.query.toDate);

      const thresholdRaw = req.body.threshold ?? req.query.threshold;
      const threshold =
        thresholdRaw !== undefined ? Number(thresholdRaw) : undefined;

      const applyStrikeRaw = req.body.applyStrike ?? req.query.applyStrike;
      const applyStrike =
        applyStrikeRaw === undefined
          ? true
          : applyStrikeRaw === true || applyStrikeRaw === "true";

      const result = await service.evaluateHotelPerformanceFlag(hotelId, {
        fromDate,
        toDate,
        threshold,
        applyStrike,
        evaluatedBy: req.user?.id,
      });

      res.json(
        successResponse(result, "Hotel performance evaluated successfully"),
      );
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }
}

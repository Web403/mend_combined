// ─────────────────────────────────────────────────────────────────────────────
// modules/tasks/task.routes.ts
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from "express";
import { TaskController } from "./task.controller";
import { authMiddleware } from "../../core/middleware/auth.middleware";
import { tenantMiddleware } from "../../core/middleware/tenant.middleware";
import { authorizeRoles } from "../../core/middleware/rbac.middleware";
import { AdminRole } from "../../shared/enums/admin";
import { UserRole } from "../../shared/enums";
import { upload } from "../../core/middleware/multer.middleware";

const router = Router();
const controller = new TaskController();
const manageRoles = [UserRole.ADMIN, UserRole.MANAGER, AdminRole.MENDADMIN];

// All task routes require a valid JWT and a resolved hotelId (tenant).
router.use(authMiddleware, tenantMiddleware);

// ── Analytics & efficiency (declare before /:id to avoid route shadowing) ─────

// GET /tasks/summary — task count by status + avg duration by type
router.get("/summary", controller.getTaskSummary.bind(controller));

// GET /tasks/efficiency/hotel — hotel-level OPH report + leaderboard (FR32, FR33)
router.get(
  "/efficiency/hotel",
  controller.getHotelEfficiencyReport.bind(controller)
);

// POST /tasks/efficiency/hotel/flag — evaluate and strike/flag hotel if performance is below threshold (FR33)
router.post(
  "/efficiency/hotel/flag",
  authorizeRoles(...manageRoles),
  controller.evaluateHotelPerformanceFlag.bind(controller)
);

// GET /tasks/efficiency/user/:userId — single user OPH + performance score (FR30, FR32)
router.get(
  "/efficiency/user/:userId",
  controller.getUserOph.bind(controller)
);

// GET /tasks/efficiency/user/:userId/history — daily/weekly efficiency history (FR31)
router.get(
  "/efficiency/user/:userId/history",
  controller.getUserEfficiencyHistory.bind(controller)
);

// ── Assignee view ─────────────────────────────────────────────────────────────
router.get("/user/:userId", controller.getTasksByAssignee.bind(controller));

// ── Core CRUD ────────────────────────────────────────────────────────────────
router.post("/create-task",authorizeRoles(...manageRoles), controller.createTask.bind(controller));
router.get("/list-tasks", controller.listTasks.bind(controller));
router.get("/get-task-by-id/:id", controller.getTaskById.bind(controller));
router.put("/update-task/:id", authorizeRoles(...manageRoles), controller.updateTask.bind(controller));
router.patch("/update-task-status/:id", upload.array("photos",10), controller.updateTaskStatus.bind(controller));
router.delete("/delete-task/:id", controller.deleteTask.bind(controller));

// TEST COMMIT

export default router;

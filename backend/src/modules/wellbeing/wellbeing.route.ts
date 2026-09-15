import { Router } from "express";
import { authorizeRoles } from "../../core/middleware/rbac.middleware";
import { UserRole } from "../../shared/enums";
import { AdminRole } from "../../shared/enums/admin";
import { WellbeingController } from "./wellbeing.controller";

const router = Router();
const controller = new WellbeingController();

const manageRoles = [UserRole.ADMIN, UserRole.MANAGER, AdminRole.MENDADMIN];

router.post("/daily", controller.submitDaily.bind(controller));
router.get("/my/history", controller.getMyHistory.bind(controller));

router.get("/users-with-wellbeing", controller.getUsersWithWellbeing.bind(controller));

router.get(
  "/users/:userId/history",
  authorizeRoles(...manageRoles),
  controller.getUserHistory.bind(controller),
);

router.get(
  "/alerts/fatigue",
  // authorizeRoles(...manageRoles),
  controller.getFatigueAlerts.bind(controller),
);

router.patch(
  "/alerts/fatigue/:id/acknowledge",
  authorizeRoles(...manageRoles),
  controller.acknowledgeAlert.bind(controller),
);

router.patch(
  "/alerts/fatigue/:id/resolve",
  authorizeRoles(...manageRoles),
  controller.resolveAlert.bind(controller),
);

export default router;

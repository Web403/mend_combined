import { Router } from "express";
import { ShiftController } from "./shift.controller";
import { authorizeRoles } from "../../core/middleware/rbac.middleware";
import { UserRole } from "../../shared/enums";
import { AdminRole } from "../../shared/enums/admin";

const router = Router();
const shiftController = new ShiftController();

// Roles allowed to manage shifts
const manageRoles = [UserRole.ADMIN, UserRole.MANAGER, AdminRole.MENDADMIN];

router.get("/get-all-shifts", shiftController.getAllShifts.bind(shiftController));
router.post("/create-shift", shiftController.createShift.bind(shiftController));
router.get("/get-user-shifts/:userId", shiftController.getUserShifts.bind(shiftController));
router.get("/get-shift-by-id/:id", shiftController.getShiftById.bind(shiftController));
router.put("/update-shift/:id", shiftController.updateShift.bind(shiftController));
router.delete("/delete-shift/:id", shiftController.deleteShift.bind(shiftController));

export default router;
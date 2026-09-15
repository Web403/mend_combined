import { Router } from "express";
import { RosterController } from "./roster.controller";
import { authorizeRoles } from "../../core/middleware/rbac.middleware";
import { UserRole } from "../../shared/enums";
import { AdminRole } from "../../shared/enums/admin";

const router = Router();
const rosterController = new RosterController();

const manageRoles = [UserRole.ADMIN, UserRole.MANAGER, AdminRole.MENDADMIN];
const userRoles = [...manageRoles,UserRole.EMPLOYEE]

// Core bulk create/update that iterates dates
router.post("/create-roster", authorizeRoles(...manageRoles), rosterController.createOrUpdateRosters.bind(rosterController));

// Retrieval
router.get("/get-all-rosters", authorizeRoles(...manageRoles), rosterController.getAllRosters.bind(rosterController));
router.get("/get-roster-by-id/:id", rosterController.getRosterById.bind(rosterController));
router.get("/get-shift-rosters/:shiftId", rosterController.getShiftRosters.bind(rosterController));

// Standard single document operations
router.put("/update-roster/:id", authorizeRoles(...manageRoles), rosterController.updateRoster.bind(rosterController));
router.get("/get-rosters-and-shift-by-userId",authorizeRoles(...userRoles),rosterController.getRostersAndshiftsByUserId.bind(rosterController))
router.delete("/delete-roster/:id", authorizeRoles(...manageRoles), rosterController.deleteRoster.bind(rosterController));
router.put("/remove-employee-from-roster/:rosterId", authorizeRoles(...manageRoles),rosterController.removeEmployeeFromRoster.bind(rosterController));

export default router;

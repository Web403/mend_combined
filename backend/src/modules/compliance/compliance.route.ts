// ─────────────────────────────────────────────────────────────────────────────
// modules/compliance/compliance.route.ts
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from "express";
import { ComplianceController } from "./compliance.controller";
import { authMiddleware } from "../../core/middleware/auth.middleware";
import { authorize } from "../../core/middleware/rbac.middleware";
import { AdminRole } from "../../shared/enums/admin";
import { UserRole } from "../../shared/enums/user";

const router = Router();
const controller = new ComplianceController();

router.use(authMiddleware);

// ── Mend Admin routes (system-level) ─────────────────────────────────────────

// POST /compliance/evaluate/:hotelId — trigger compliance evaluation (FR34, FR35)
router.post(
  "/evaluate",
  // authorize({ roles: [AdminRole.MENDADMIN, AdminRole.SUPER_ADMIN] }),
  controller.evaluate.bind(controller)
);

// GET /compliance/reports — all hotels overview (FR39) — Mend Admin only
router.get(
  "/reports",
  authorize({ roles: [AdminRole.MENDADMIN, AdminRole.SUPER_ADMIN] }),
  controller.getAllReports.bind(controller)
);

// ── Hotel-scoped routes (hotel manager / admin can see their own) ─────────────

// GET /compliance/report/:hotelId — single hotel compliance report (FR39)
router.get(
  "/report",
  // authorize(
  //   { roles: [AdminRole.MENDADMIN, AdminRole.SUPER_ADMIN] },
  //   { roles: [UserRole.ADMIN, UserRole.MANAGER] }
  // ),
  controller.getReport.bind(controller)
);

// GET /compliance/audit/:hotelId — audit trail (FR36)
router.get(
  "/audit",
  controller.getAuditLogs.bind(controller)
);

// GET /compliance/hiring-check/:hotelId — hiring eligibility gate (FR38)
// Recruitment module calls this; also exposed for direct checks
router.get(
  "/hiring-check/:hotelId",
  authorize(
    { roles: [AdminRole.MENDADMIN, AdminRole.SUPER_ADMIN] },
    { roles: [UserRole.ADMIN, UserRole.MANAGER] }
  ),
  controller.checkHiringEligibility.bind(controller)
);

export default router;

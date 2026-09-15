// ─────────────────────────────────────────────────────────────────────────────
// modules/passport/passport.route.ts
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from "express";
import { PassportController } from "./passport.controller";
import { authMiddleware } from "../../core/middleware/auth.middleware";
import { tenantMiddleware } from "../../core/middleware/tenant.middleware";
import { authorize } from "../../core/middleware/rbac.middleware";
import { UserRole } from "../../shared/enums/user";
import { AdminRole } from "../../shared/enums/admin";

const router = Router();
const controller = new PassportController();

router.use(authMiddleware, tenantMiddleware);

// ── Public credential lookup (FR50) — authenticated but no role restriction ──
// Recruiters, managers, and Mend admins can look up a passport by credential
// GET /passport/credential/:credentialNumber
router.get(
  "/credential/:credentialNumber",
  controller.getByCredential.bind(controller)
);

// ── Hotel-wide passport list (managers / admins) ──────────────────────────────
// GET /passport/hotel
router.get(
  "/hotel",
  authorize(
    { roles: [UserRole.MANAGER, UserRole.ADMIN] },
    { roles: [AdminRole.MENDADMIN, AdminRole.SUPER_ADMIN] }
  ),
  controller.getByHotel.bind(controller)
);

// ── Per-user routes ───────────────────────────────────────────────────────────

// GET /passport/user/:userId — get a user's passport (FR49)
router.get(
  "/user/:userId",
  authorize(
    { roles: [UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.ADMIN] },
    { roles: [AdminRole.MENDADMIN, AdminRole.SUPER_ADMIN] }
  ),
  controller.getByUser.bind(controller)
);

// POST /passport — create passport (FR48, FR50)
router.post(
  "/",
  authorize(
    { roles: [UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.ADMIN] },
    { roles: [AdminRole.MENDADMIN, AdminRole.SUPER_ADMIN] }
  ),
  controller.createPassport.bind(controller)
);

// PUT /passport/:userId — update skills + career progression (FR49, FR51)
router.put(
  "/:userId",
  authorize(
    { roles: [UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.ADMIN] },
    { roles: [AdminRole.MENDADMIN, AdminRole.SUPER_ADMIN] }
  ),
  controller.updatePassport.bind(controller)
);

// POST /passport/:userId/sync — re-sync LMS certs + efficiency score
router.post(
  "/:userId/sync",
  authorize(
    { roles: [UserRole.MANAGER, UserRole.ADMIN] },
    { roles: [AdminRole.MENDADMIN, AdminRole.SUPER_ADMIN] }
  ),
  controller.syncPassport.bind(controller)
);

export default router;

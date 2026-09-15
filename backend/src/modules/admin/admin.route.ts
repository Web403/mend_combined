import { Router } from "express";
import { AdminController } from "./admin.controller";
import { authMiddleware } from '../../core/middleware/auth.middleware';
import { authorizeRoles } from '../../core/middleware/rbac.middleware';
import { AdminRole } from '../../shared/enums/admin';
import { HotelController } from '../hotel/hotel.controller';
import { tenantMiddleware } from "../../core/middleware/tenant.middleware";

const router = Router();
const controller = new AdminController();

// Public route — no auth required
router.post("/login", controller.login.bind(controller));

// All routes below require admin auth first, then tenant resolution
router.use(authMiddleware, authorizeRoles(AdminRole.MENDADMIN), tenantMiddleware);

router.post('/Send-Credentials', controller.sendCredentials.bind(controller));

export default router;

import { Router } from 'express';
import { UserController } from './user.controller';
import { authorizeRoles } from '../../core/middleware/rbac.middleware';
import { UserRole } from '../../shared/enums';
import { AdminRole } from '../../shared/enums/admin';

const router = Router();
const userController = new UserController();

const manageRoles = [UserRole.ADMIN, UserRole.MANAGER, AdminRole.MENDADMIN];

router.post('/createUser', userController.createUser.bind(userController));
router.put('/updateUser/:id', userController.updateUser.bind(userController));
router.patch('/suspendUser/:id', userController.suspendUser.bind(userController));
router.delete('/deleteUser/:id', userController.deleteUser.bind(userController));
router.get("/get-users",  userController.getUsers.bind(userController));
router.get("/get-users-performance",  userController.getUsersPerformance.bind(userController));
router.get("/get-user-work-summary",  userController.getUserWorkSummary.bind(userController));

// Admin-only routes
router.post('/admin/users', userController.createAdminUser.bind(userController));
router.get('/admin/users', userController.getUsers.bind(userController));
router.get('/admin/user/:id', userController.getUserById.bind(userController));
router.put('/admin/users/:id', authorizeRoles(AdminRole.MENDADMIN), userController.updateUser.bind(userController));
router.patch('/admin/users/:id/suspend', authorizeRoles(AdminRole.MENDADMIN), userController.suspendUser.bind(userController));
router.delete('/admin/users/:id', authorizeRoles(AdminRole.MENDADMIN), userController.deleteUser.bind(userController));

export default router;

/// <reference types="multer" />
import { Router } from 'express';
import multer = require('multer');
import { HotelController } from './hotel.controller';
import { authMiddleware } from '../../core/middleware/auth.middleware';
import { authorizeRoles } from '../../core/middleware/rbac.middleware';
import { AdminRole } from '../../shared/enums/admin';
import { UserRole } from '../../shared/enums';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });
const hotelController = new HotelController();

router.post('/login', hotelController.login.bind(hotelController));

router.post(
    '/admin/Hotels',
    authMiddleware,
    authorizeRoles(AdminRole.SUPER_ADMIN),
    hotelController.createHotel.bind(hotelController)
);

router.get(
    '/admin/Hotels',
    authMiddleware,
    authorizeRoles(AdminRole.SUPER_ADMIN),
    hotelController.getHotels.bind(hotelController)
);

router.get(
    '/admin/Hotels/:hotelId',
    authMiddleware,
    authorizeRoles(AdminRole.SUPER_ADMIN),
    hotelController.getHotelById.bind(hotelController)
);

router.put(
    '/admin/Hotels/:hotelId',
    authMiddleware,
    authorizeRoles(AdminRole.SUPER_ADMIN),
    hotelController.updateHotel.bind(hotelController)
);

router.patch(
    '/admin/Hotels/:hotelId/status',
    authMiddleware,
    authorizeRoles(AdminRole.SUPER_ADMIN),
    hotelController.updateHotelStatus.bind(hotelController)
);

router.patch(
    '/admin/Hotels/:hotelId/subscription',
    authMiddleware,
    authorizeRoles(AdminRole.SUPER_ADMIN),
    hotelController.updateSubscription.bind(hotelController)
);

router.get(
    '/admin/Hotels/:hotelId/analytics',
    authMiddleware,
    authorizeRoles(AdminRole.SUPER_ADMIN),
    hotelController.getHotelAnalytics.bind(hotelController)
);

router.delete(
    '/admin/Hotels/:hotelId',
    authMiddleware,
    authorizeRoles(AdminRole.SUPER_ADMIN),
    hotelController.deleteHotel.bind(hotelController)
);

const manageRoles = [UserRole.ADMIN, UserRole.MANAGER, AdminRole.MENDADMIN, AdminRole.SUPER_ADMIN];

router.post(
    '/admin/Hotels/:hotelId/users',
    authMiddleware,
    authorizeRoles(...manageRoles),
    hotelController.createHotelUser.bind(hotelController)
);

router.post(
    '/admin/Hotels/:hotelId/users/bulk',
    authMiddleware,
    authorizeRoles(...manageRoles),
    upload.single('file'),
    hotelController.bulkCreateHotelUsers.bind(hotelController)
);

router.patch(
    '/admin/Hotels/:hotelId/users/:userId/promote',
    authMiddleware,
    authorizeRoles(...manageRoles),
    hotelController.promoteHotelUser.bind(hotelController)
);

export default router;

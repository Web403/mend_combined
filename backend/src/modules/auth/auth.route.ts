import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authMiddleware } from '../../core/middleware/auth.middleware';

const router = Router();
const ctrl = new AuthController();

router.post('/register', ctrl.register.bind(ctrl));
router.post('/login', ctrl.login.bind(ctrl));
router.post('/refresh', ctrl.refresh.bind(ctrl));
router.post('/logout', authMiddleware, ctrl.logout.bind(ctrl));

export default router;
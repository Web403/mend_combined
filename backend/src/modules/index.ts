import { Router } from 'express';
import paymentRoutes      from "./payment/payment.route";
import authRoutes         from "./auth/auth.route";
import shiftRoutes        from "./shift/shift.route";
import userRoutes         from "./users/user.route";
import adminRoutes        from "./admin/admin.route";
import hotelRoutes        from "./hotel/hotel.route";
import attendanceRoutes   from "./attendance/attendance.route";
import taskRoutes         from "./tasks/task.route";
import lmsRoutes          from "./lms/lms.route";
import sosRoutes          from "./sos/sos.route";
import recruitmentRoutes  from "./recruitment/recruitment.route";
import rosterRoutes       from "./rosters/roster.route";
import gigRoutes           from "./gigs/gig.route";
import rbacRoutes         from "./rbac/rbac.route";
import { tenantMiddleware } from '../core/middleware/tenant.middleware';
import { authMiddleware }   from '../core/middleware/auth.middleware';
import analyticsRoutes     from './analytics/analytics.route';
import wellbeingRoutes     from './wellbeing/wellbeing.route';
import complianceRoutes    from './compliance/compliance.route';
import ReviewRoutes from './review/review.route';

const router = Router();

// ── Public routes (no auth) ───────────────────────────────────────────────────
router.use('/auth',    authRoutes);
router.use('/admin',   adminRoutes);
router.use('/hotel',   hotelRoutes);
router.use('/payment', paymentRoutes);
router.use('/analytics', analyticsRoutes);

// Gig routes handle their own auth internally and cover both /gigs and /bookings paths
router.use('/gigs', gigRoutes);

// ── Authenticated routes ──────────────────────────────────────────────────────
router.use(authMiddleware);
router.use(tenantMiddleware);

router.use('/rbac',        rbacRoutes);
router.use('/attendance',  attendanceRoutes);
router.use('/shift',       shiftRoutes);
router.use('/user',        userRoutes);
router.use('/task',        taskRoutes);
router.use('/lms',         lmsRoutes);
router.use('/sos',         sosRoutes);
router.use('/wellbeing',   wellbeingRoutes);
router.use('/recruitment', recruitmentRoutes);
router.use('/roster',      rosterRoutes);
router.use('/compliance',  complianceRoutes);
router.use('/review',ReviewRoutes)

router.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

export default router;

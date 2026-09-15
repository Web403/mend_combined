import { Router } from 'express';
import { AttendanceController } from './attendance.controller';

const router = Router();
const ctrl = new AttendanceController();

router.post('/clock-in', ctrl.clockIn.bind(ctrl));
router.post('/clock-out', ctrl.clockOut.bind(ctrl));
router.get('/history', ctrl.getHistory.bind(ctrl));
router.get('/live', ctrl.getLive.bind(ctrl));
router.get('/getEmployeesWithAttendance', ctrl.getEmployeesWithAttendance.bind(ctrl));

export default router;
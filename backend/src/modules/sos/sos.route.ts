import { Router } from 'express';
import { SOSController } from './sos.controller';

const router = Router();
const ctrl = new SOSController();

router.post('/trigger', ctrl.triggerSOS.bind(ctrl));
router.get('/', ctrl.getSOSAlerts.bind(ctrl));
router.get('/:id', ctrl.getSOSById.bind(ctrl));
router.put('/:id/escalate', ctrl.escalateSOS.bind(ctrl));
router.put('/:id/resolve', ctrl.resolveSOS.bind(ctrl));

export default router;
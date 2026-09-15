import { Router } from "express";
import { PaymentController } from "./payment.controller";

const router = Router();
const paymentController = new PaymentController();

router.post("/create-payment", paymentController.create.bind(paymentController))
router.post("/initiate-payment", paymentController.initiate.bind(paymentController))
router.get("/payment-status/:orderId", paymentController.getStatus.bind(paymentController))
router.get("/delete-payment-entry", paymentController.deletePaymentEntry.bind(paymentController))
export default router;
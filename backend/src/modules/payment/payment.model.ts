import mongoose from "mongoose";
import { IPayment } from "../../shared/interfaces";
import { PaymentStatus } from "../../shared/enums/common";

const paymentSchema = new mongoose.Schema<IPayment>({
    merchantOrderId: { type: String, required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: Object.values(PaymentStatus) },
    phonePayTxnId: String,
    phonePayOrderId: String,
}, { timestamps: true })

export const PaymentModel = mongoose.model<IPayment>("Payment", paymentSchema)
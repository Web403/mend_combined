import { PaymentStatus } from "../enums/common";

export interface IPayment {
    merchantOrderId: string;
    amount: number;
    status: PaymentStatus;
    phonePayTxnId?: string;
    phonePayOrderId?: string;
    email?: string;
    password?: string;
}
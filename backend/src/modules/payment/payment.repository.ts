import { PaymentModel } from "./payment.model";

export class PaymentRepository {
    async create(data: any) {
        return PaymentModel.create(data);
    }

    async updateStatus(merchantOrderId: string, update: any) {
        return PaymentModel.findOneAndUpdate({ merchantOrderId }, update)
    }

    async findByOrder(merchantOrderId: string) {
        return PaymentModel.findOne({ merchantOrderId })
    }

    async delete(merchantOrderId: string) {
        return PaymentModel.findOneAndDelete({ merchantOrderId })
    }
}
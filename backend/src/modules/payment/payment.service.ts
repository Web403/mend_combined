import { CreateSdkOrderRequest, MetaInfo } from "pg-sdk-node";
import { PhonePayClient } from "../../config/phonepay";
import { PaymentRepository } from "./payment.repository";
import { env } from "../../config/env";

// All non-success states PhonePe can return
const FAILED_STATES = ["FAILED", "DECLINED", "TIMED_OUT", "CANCELLED"];

export class PaymentService {
    private repo = new PaymentRepository();

    async createPayment(orderId: string, amount: number) {
        await this.repo.create({ merchantOrderId: orderId, amount, status: "PENDING" })

        const paymentSuccessRedirectUrl = env.PAYMENT_SUCCESS_REDIRECT_URL

        const orderRequest = CreateSdkOrderRequest.StandardCheckoutBuilder()
            .merchantOrderId(orderId)
            .amount(amount)
            .disablePaymentRetry(true)
            .redirectUrl(paymentSuccessRedirectUrl)
            .build();

        return await PhonePayClient.createSdkOrder(orderRequest);
    }

    async initiatePayment(orderId: string, amount: number, paymentSuccessRedirectUrl: string) {
        const metaInfo = MetaInfo.builder().udf1("udf1").udf2("udf2").udf3("udf3").build();

        const orderRequest = CreateSdkOrderRequest.StandardCheckoutBuilder()
            .merchantOrderId(orderId)
            .amount(amount)
            .metaInfo(metaInfo)
            .redirectUrl(paymentSuccessRedirectUrl)
            .expireAfter(3600)
            .message("Please pay the registration fee")
            .build();

        const response = await PhonePayClient.pay(orderRequest);
        await this.repo.create({
            merchantOrderId: orderId,
            amount: amount / 100,
            status: response.state,
            phonePayOrderId: response.orderId
        });
        return response;
    }

    async verifyPaymentStatus(orderId: string) {
        const res = await PhonePayClient.getOrderStatus(orderId);

        await this.repo.updateStatus(orderId, { status: res.state });

        // fix: was only checking errorCode === "TXN_CANCELLED" — any FAILED/DECLINED/
        // TIMED_OUT/CANCELLED state also returned success:true, causing the controller
        // to mark the payment done and send credentials even on failed payments
        const isSuccess = res.state === "COMPLETED" && !res.errorCode;

        if (!isSuccess) {
            return {
                success: false,
                message: this.getFailureMessage(res.errorCode, res.state),
                data: {
                    amount: 0,
                    status: res.state,
                }
            };
        }

        return {
            success: true,
            message: "Payment successful",
            data: {
                amount: res.amount / 100,
                status: res.state,
            }
        };
    }

    private getFailureMessage(errorCode: string | undefined, state: string): string {
        if (errorCode === "TXN_CANCELLED" || state === "CANCELLED") {
            return "Transaction cancelled, please try again.";
        }
        if (state === "TIMED_OUT") {
            return "Payment session timed out, please try again.";
        }
        if (errorCode === "PAYMENT_DECLINED" || state === "DECLINED") {
            return "Payment was declined by your bank, please try another method.";
        }
        return "Payment failed, please try again.";
    }

    async deletePayment(orderId: string) {
        return await this.repo.delete(orderId);
    }
}
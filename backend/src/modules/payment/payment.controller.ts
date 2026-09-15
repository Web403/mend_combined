import { Request, Response } from "express";
import { PaymentService } from "./payment.service";
import { logger } from "../../core/utils/logger";
import { HotelService } from "../hotel/hotel.service";
import { UserService } from "../users/user.service";
import { errorResponse, successResponse } from "../../core/utils/ApiResponse";
import { EmailService } from "../../core/utils/EmailService";
import { HelperService } from "../../shared/services/helper.service";
import { RegistrationType } from "../../shared/enums/common";
import { env } from "../../config/env";   // fix: was `import { env } from "process"` — Node's process object, not your config

const paymentService = new PaymentService()
const hotelService = new HotelService();
const userService = new UserService()
const helperService = new HelperService()

export class PaymentController {

    async create(req: Request, res: Response) {
        const { orderId, amount } = req.body
        const result = await paymentService.createPayment(orderId, amount * 100);
        res.json(result)
    }

    async initiate(req: Request, res: Response) {
        try {
            const { orderId, hotel, user } = req.body;

            let numberOfUsers = 1;

            if (hotel) {
                numberOfUsers = Number(hotel.staffStrength)
            }

            const amount = helperService.calculateAmount(numberOfUsers, hotel ? RegistrationType.HOTEL : RegistrationType.USER)

            let paymentSuccessRedirectUrl = `${env.PAYMENT_SUCCESS_REDIRECT_URL}/success?type=${hotel ? RegistrationType.HOTEL : RegistrationType.USER}&id=${orderId}&hotelId=`

            let initiatedMessage: string = " ";
            if (hotel) {
                let newHotel = await hotelService.createHotel(hotel);
                paymentSuccessRedirectUrl += newHotel.id
                initiatedMessage = "Payment for Hotel instance initialized";
            }
            if (user) {
                let newUser = await userService.createUser(user);
                paymentSuccessRedirectUrl += newUser.id
                initiatedMessage = "Payment for User instance initialized";
            }

            const result = await paymentService.initiatePayment(orderId, (amount as number) * 100, paymentSuccessRedirectUrl);

            res.status(200).json(successResponse(result, initiatedMessage))
        } catch (error: any) {
            logger.error("Error in payment initiate:", error);
            res.status(500).json(errorResponse(error.message))
        }
    }

    async getStatus(req: Request, res: Response) {
        const { orderId } = req.params;
        const { type, id } = req.query;
        const result = await paymentService.verifyPaymentStatus(orderId as string);
        if (result.success && type == RegistrationType.HOTEL) {
            await hotelService.updateHotel(id as string, { initialPaymentDone: true, paymentId: orderId as string, subscriptionAmount: result.data.amount })
        }
        if (result.success && type == RegistrationType.USER) {
            const updatedUser = await userService.updateUser(id as string, { initialPaymentDone: true, paymentId: orderId as string, subscriptionAmount: result.data.amount })
            await EmailService.sendCredentialsEmail(updatedUser?.email as string, updatedUser?.password as string, updatedUser?.profile.firstName + " " + updatedUser?.profile.lastName, "user")
        }

        if (result.success) {
            res.status(200).json(successResponse(result.data, result.message))
        } else {
            res.status(500).json(errorResponse(result.message))
        }
    }

    async deletePaymentEntry(req: Request, res: Response) {
        try {
            const { orderId, type, id } = req.query

            if (type == "hotel") {
                await hotelService.deleteHotel(id as string)
            }
            if (type == "user") {
                await userService.deleteUser(id as string)
            }
            await paymentService.deletePayment(orderId as string)
            res.status(200).json(successResponse({}, "Payment entry deleted successfully"))
        } catch (error: any) {
            logger.error("Error in deleting payment entry", error);
            res.status(500).json(errorResponse(error.message))
        }
    }
}
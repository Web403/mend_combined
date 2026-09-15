import { Request, Response } from "express";
import { AdminService } from "./admin.service";
import { successResponse, errorResponse } from "../../core/utils/ApiResponse";
import { HotelService } from "../hotel/hotel.service";
import { UserService } from "../users/user.service";
import { AuthenticatedRequest } from "../../core/middleware/auth.middleware";

const service = new AdminService();
const hotelService = new HotelService();
const userService = new UserService();

export class AdminController {
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      const tokens = await service.login(email, password);
      res.json(successResponse(tokens));
    } catch (error: any) {
      res.status(400).json(errorResponse(error.message));
    }
  }

  async sendCredentials(req: AuthenticatedRequest, res: Response) {
          try {
              const { hotelId, userId } = req.query;
              if (hotelId) {
                  await hotelService.sendCredentialsToHotel(hotelId as string);
                  res.json(successResponse(null, 'Credentials sent to hotel successfully'));
              } else if (userId) {
                  await userService.sendCredentialsToUser(userId as string);
                  res.json(successResponse(null, 'Credentials sent to user successfully'));
              } else {
                  res.status(400).json(errorResponse('Hotel ID or User ID is required'));
              }
          } catch (error: any) {
              res.status(400).json(errorResponse(error.message));
          }
      }
}

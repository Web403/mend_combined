import { Response } from "express";
import { ShiftService } from "./shift.service";
import { successResponse } from "../../core/utils/ApiResponse";
import { AuthenticatedRequest } from "../../core/middleware/auth.middleware";

const shiftService = new ShiftService();


export class ShiftController {

    async createShift(
        req: AuthenticatedRequest,
        res: Response
    ) {
        const hotelId = (req.user?.hotelId as string) || (req.user?.id as string);
        const shift = await shiftService.createShift(hotelId, req.body);
        res.status(201).json(successResponse(shift));
    };

    async getShiftById(
        req: AuthenticatedRequest,
        res: Response
    ) {
        const { id } = req.params;
        const hotelId = req.user?.hotelId as string;
        const shift = await shiftService.getShiftById(hotelId, id as string);
        res.json(successResponse(shift));
    };

    async getAllShifts(
        req: AuthenticatedRequest,
        res: Response
    ) {
        const hotelId = (req.user?.hotelId as string) || (req.user?.id as string);
        const shifts = await shiftService.getAllShifts(hotelId);
        res.json(successResponse(shifts));
    };

    async getUserShifts(
        req: AuthenticatedRequest,
        res: Response
    ) {
        const { id } = (req as any).params;
        const hotelId = (req as any).hotelId;
        const shifts = await shiftService.getUserShifts(hotelId, id);
        res.json(successResponse(shifts));
    };

    async updateShift(
        req: AuthenticatedRequest,
        res: Response
    ) {
        const { id } = (req as any).params;
        const hotelId = (req as any).hotelId;
        const shift = await shiftService.updateShift(hotelId, id, req.body);
        res.json(successResponse(shift));
    };

    async deleteShift(
        req: AuthenticatedRequest,
        res: Response
    ) {
        const { id } = (req as any).params;
        const hotelId = (req as any).hotelId;
        const result = await shiftService.deleteShift(hotelId, id);
        res.json(successResponse(result));
    };
}

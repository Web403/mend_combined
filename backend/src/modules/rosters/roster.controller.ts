import { Response } from "express";
import { RosterService } from "./roster.service";
import { errorResponse, successResponse } from "../../core/utils/ApiResponse";
import { AuthenticatedRequest } from "../../core/middleware/auth.middleware";

const rosterService = new RosterService();

export class RosterController {

    async createOrUpdateRosters(
        req: AuthenticatedRequest,
        res: Response
    ) {
        const hotelId = req.user?.hotelId as string;
        const rosters = await rosterService.createOrUpdateRosters(hotelId, req.body);
        res.status(201).json(successResponse(rosters));
    }

    async getRosterById(
        req: AuthenticatedRequest,
        res: Response
    ) {
        const { id } = (req as any).params;
        const hotelId = req.user?.hotelId as string;
        const roster = await rosterService.getRosterById(hotelId, id);
        res.json(successResponse(roster));
    }

    async getAllRosters(
        req: AuthenticatedRequest,
        res: Response
    ) {
        const hotelId = req.user?.hotelId;
        const rosters = await rosterService.getAllRosters(hotelId as string);
        res.json(successResponse(rosters));
    }

    async getShiftRosters(
        req: AuthenticatedRequest,
        res: Response
    ) {
        const { shiftId } = (req as any).params;
        const hotelId = req.user?.hotelId;
        const rosters = await rosterService.getShiftRosters(hotelId as string, shiftId);
        res.json(successResponse(rosters));
    }

    async getRostersAndshiftsByUserId(req: AuthenticatedRequest, res: Response) {
        const hotelId = req.user?.hotelId as string;
        const userId = req.user?.id as string;

        try {   
            const rosters = await rosterService.getRostersAndShiftsByUserId(hotelId,userId);
            res.json(successResponse(rosters));
        } catch (error :any) {
            res.status(error.httpStatus).json(errorResponse(error.code));
        }
    }

    async updateRoster(
        req: AuthenticatedRequest,
        res: Response
    ) {
        const { id } = (req as any).params ;
        const hotelId = req.user?.hotelId as string;
        const roster = await rosterService.updateRoster(hotelId, id, req.body);
        res.json(successResponse([roster]));
    }

    async deleteRoster(
        req: AuthenticatedRequest,
        res: Response
    ) {
        const { id } = (req as any).params;
        const hotelId = (req as any).user.id;
        const result = await rosterService.deleteRoster(hotelId, id);
        res.json(successResponse(result));
    }

    async removeEmployeeFromRoster(req:AuthenticatedRequest, res:Response) {
        const {rosterId} = (req as any).params;
        const {employeeId} = req.body;
        
        const result = await rosterService.removeEmployeeFromRoster(rosterId, employeeId);
        res.json(successResponse(result));
    }
}

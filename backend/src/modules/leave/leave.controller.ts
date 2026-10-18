// ─────────────────────────────────────────────────────────────────────────────
// modules/leave/leave.controller.ts
//
// HTTP adapters only: read the actor and input, call the service, shape the
// response. Business rules live in the services. Errors are returned in the
// standard envelope with `meta.code`, so the frontend can branch on the code.
// ─────────────────────────────────────────────────────────────────────────────

import { NextFunction, Request, Response } from "express";
import { errorResponse, successResponse } from "../../core/utils/ApiResponse";
import { DayOffService } from "./day-off.service";
import { LeaveRequestService } from "./leave-request.service";
import { getLeaveActor } from "./leave.actor";
import { LeaveError } from "./leave.error";

/** Maps LeaveError to its status and code. Anything else goes to the global error handler. */
function fail(err: unknown, res: Response, next: NextFunction): void {
  if (err instanceof LeaveError) {
    res.status(err.statusCode).json(errorResponse(err.message, { code: err.code }));
    return;
  }
  next(err);
}

const requestService = new LeaveRequestService();
const dayOffService = new DayOffService();

const idParam = (req: Request): string => String(req.params.id ?? "");

export class LeaveRequestController {
  async createRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await requestService.createRequest(getLeaveActor(req), req.body);
      res.status(201).json(successResponse(result, "Leave request submitted"));
    } catch (err) {
      fail(err, res, next);
    }
  }

  async listMyRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await requestService.listMyRequests(getLeaveActor(req), req.query);
      res.json(successResponse(result.items, "Your leave requests retrieved", result.pagination));
    } catch (err) {
      fail(err, res, next);
    }
  }

  async listRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await requestService.listRequests(getLeaveActor(req), req.query);
      res.json(successResponse(result.items, "Leave requests retrieved", result.pagination));
    } catch (err) {
      fail(err, res, next);
    }
  }

  async getRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await requestService.getRequest(getLeaveActor(req), idParam(req));
      res.json(successResponse(result, "Leave request retrieved"));
    } catch (err) {
      fail(err, res, next);
    }
  }

  async cancelRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await requestService.cancelRequest(getLeaveActor(req), idParam(req));
      res.json(successResponse(result, "Leave request cancelled"));
    } catch (err) {
      fail(err, res, next);
    }
  }

  async approveRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await requestService.approveRequest(getLeaveActor(req), idParam(req), req.body);
      res.json(successResponse(result, "Leave request approved"));
    } catch (err) {
      fail(err, res, next);
    }
  }

  async rejectRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await requestService.rejectRequest(getLeaveActor(req), idParam(req), req.body);
      res.json(successResponse(result, "Leave request rejected"));
    } catch (err) {
      fail(err, res, next);
    }
  }
}

export class DayOffController {
  async assignDayOffs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await dayOffService.assignDayOffs(getLeaveActor(req), req.body);
      res.status(201).json(successResponse(result, "Day offs assigned"));
    } catch (err) {
      fail(err, res, next);
    }
  }

  async listDayOffs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await dayOffService.listDayOffs(getLeaveActor(req), req.query);
      res.json(successResponse(result.items, "Day offs retrieved", result.pagination));
    } catch (err) {
      fail(err, res, next);
    }
  }

  async listMyDayOffs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await dayOffService.listMyDayOffs(getLeaveActor(req), req.query);
      res.json(successResponse(result, "Your day offs retrieved"));
    } catch (err) {
      fail(err, res, next);
    }
  }

  async deleteDayOff(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await dayOffService.deleteDayOff(getLeaveActor(req), idParam(req));
      res.json(successResponse(result, "Day off removed"));
    } catch (err) {
      fail(err, res, next);
    }
  }
}

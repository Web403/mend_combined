// ─────────────────────────────────────────────────────────────────────────────
// modules/leave/leave.actor.ts
//
// Resolves WHO is calling and WHICH hotel they act for, from the verified JWT.
//
// The hotel is never taken from the `X-Hotel-Id` header or the query string.
// Hotel-owner tokens carry no `hotelId` claim (their `sub` is the hotel's own
// id), so the tenant is `sub` for them and `hotelId` for everyone else.
// ─────────────────────────────────────────────────────────────────────────────

import { NextFunction, Request, Response } from "express";
import { AuthenticatedRequest } from "../../core/middleware/auth.middleware";
import { errorResponse } from "../../core/utils/ApiResponse";
import { AuthRole } from "../../shared/enums/common";
import { LeaveError, LeaveErrors } from "./leave.error";
import { LEAVE_APPROVER_ROLES, LEAVE_REQUESTER_ROLES } from "./leave.constants";

export interface LeaveActor {
  /** `USER` for staff accounts; `HOTEL` for the hotel-owner account. */
  kind: "USER" | "HOTEL";
  /** The staff member's User._id. Null for hotel-owner accounts. */
  userId: string | null;
  /** Tenant the actor acts for. Every query is scoped by this value. */
  hotelId: string;
  roles: string[];
}

export type LeaveAuthenticatedRequest = AuthenticatedRequest & { leaveActor?: LeaveActor };

const OBJECT_ID_PATTERN = /^[a-fA-F0-9]{24}$/;

/**
 * Attaches a `LeaveActor` to the request. Requires the global auth middleware to
 * have run. Failures are answered here, in the same envelope and with the same
 * `meta.code` as the controllers, so the frontend sees one error shape.
 */
export function resolveLeaveActor(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const reject = (error: LeaveError) => {
    res.status(error.statusCode).json(errorResponse(error.message, { code: error.code }));
  };

  const user = (req as AuthenticatedRequest).user;
  if (!user?.id) {
    reject(LeaveErrors.unauthenticated());
    return;
  }

  const roles = user.roles ?? [];
  const isHotelAccount = roles.includes(AuthRole.HOTEL);
  const hotelId = isHotelAccount ? user.id : user.hotelId;

  if (!hotelId || !OBJECT_ID_PATTERN.test(hotelId)) {
    reject(LeaveErrors.noHotelScope());
    return;
  }

  const actor: LeaveActor = {
    kind: isHotelAccount ? "HOTEL" : "USER",
    userId: isHotelAccount ? null : user.id,
    hotelId,
    roles,
  };

  (req as LeaveAuthenticatedRequest).leaveActor = actor;
  (req as LeaveAuthenticatedRequest).hotelId = hotelId;
  next();
}

export function getLeaveActor(req: Request): LeaveActor {
  const actor = (req as LeaveAuthenticatedRequest).leaveActor;
  if (!actor) {
    // Programming error: the router forgot to mount resolveLeaveActor.
    throw LeaveErrors.unauthenticated();
  }
  return actor;
}

/** Staff members who can be the subject of a leave request. */
export function canRequestLeave(actor: LeaveActor): boolean {
  return (
    actor.kind === "USER" &&
    actor.userId !== null &&
    actor.roles.some((role) => LEAVE_REQUESTER_ROLES.includes(role))
  );
}

/** Managers, admins and the hotel-owner account. */
export function canReviewLeave(actor: LeaveActor): boolean {
  return (
    actor.kind === "HOTEL" ||
    actor.roles.some((role) => LEAVE_APPROVER_ROLES.includes(role))
  );
}

export function assertCanRequestLeave(actor: LeaveActor): void {
  if (!canRequestLeave(actor)) throw LeaveErrors.requesterForbidden();
}

export function assertCanReviewLeave(actor: LeaveActor): void {
  if (!canReviewLeave(actor)) throw LeaveErrors.approverForbidden();
}

/**
 * The User._id recorded as the reviewer of a decision. Hotel-owner accounts
 * review as the hotel itself. Staff reviewers must still be ACTIVE in this hotel,
 * so a suspended manager cannot keep approving on an old token.
 */
export async function resolveReviewerId(
  actor: LeaveActor,
  employees: { findActiveInHotel(hotelId: string, userId: string): Promise<unknown> },
): Promise<string> {
  if (actor.kind === "HOTEL") return actor.hotelId;
  const reviewer = await employees.findActiveInHotel(actor.hotelId, actor.userId as string);
  if (!reviewer) throw LeaveErrors.inactiveEmployee();
  return actor.userId as string;
}

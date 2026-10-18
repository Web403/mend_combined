import { AuthRole } from "../../src/shared/enums/common";
import { UserRole } from "../../src/shared/enums/user";
import {
  LeaveActor,
  assertCanRequestLeave,
  assertCanReviewLeave,
  canRequestLeave,
  canReviewLeave,
  resolveLeaveActor,
} from "../../src/modules/leave/leave.actor";
import { LeaveError } from "../../src/modules/leave/leave.error";

const HOTEL = "65a1b2c3d4e5f60718293a4b";
const USER = "65a1b2c3d4e5f60718293a4c";

const actorWith = (roles: string[], kind: "USER" | "HOTEL" = "USER"): LeaveActor => ({
  kind,
  userId: kind === "USER" ? USER : null,
  hotelId: HOTEL,
  roles,
});

describe("role matrix", () => {
  it.each([
    [UserRole.EMPLOYEE, true],
    [UserRole.MANAGER, true],
    [UserRole.ADMIN, true],
    [UserRole.HR, true],
    [UserRole.STUDENT, false],
    [UserRole.PROFESSIONAL, false],
    [UserRole.CATERER_EVENT_MANAGER, false],
  ])("role %s can request leave: %s", (role, expected) => {
    expect(canRequestLeave(actorWith([role]))).toBe(expected);
  });

  it.each([
    [UserRole.MANAGER, true],
    [UserRole.ADMIN, true],
    [UserRole.EMPLOYEE, false],
    [UserRole.HR, false],
  ])("role %s can review leave: %s", (role, expected) => {
    expect(canReviewLeave(actorWith([role]))).toBe(expected);
  });

  it("the hotel-owner account can review but cannot request leave", () => {
    const owner = actorWith([AuthRole.HOTEL], "HOTEL");
    expect(canReviewLeave(owner)).toBe(true);
    expect(canRequestLeave(owner)).toBe(false);
  });

  it("assert helpers throw the matching LeaveError", () => {
    expect(() => assertCanRequestLeave(actorWith([UserRole.STUDENT]))).toThrow(LeaveError);
    expect(() => assertCanReviewLeave(actorWith([UserRole.EMPLOYEE]))).toThrow(
      expect.objectContaining({ code: "LEAVE_APPROVER_FORBIDDEN" }),
    );
  });
});

describe("resolveLeaveActor", () => {
  const run = (user: any) => {
    const req: any = { user };
    const next = jest.fn();
    const res: any = { status: jest.fn(), json: jest.fn() };
    res.status.mockReturnValue(res);
    resolveLeaveActor(req, res, next);
    return { req, next, res };
  };

  it("takes the tenant from the token's hotelId for staff accounts", () => {
    const { req, next } = run({ id: USER, roles: [UserRole.EMPLOYEE], hotelId: HOTEL });
    expect(next).toHaveBeenCalledWith();
    expect(req.leaveActor).toEqual({ kind: "USER", userId: USER, hotelId: HOTEL, roles: [UserRole.EMPLOYEE] });
    expect(req.hotelId).toBe(HOTEL);
  });

  it("takes the tenant from sub for hotel-owner accounts, which have no hotelId claim", () => {
    const { req, next } = run({ id: HOTEL, roles: [AuthRole.HOTEL] });
    expect(next).toHaveBeenCalledWith();
    expect(req.leaveActor).toEqual({ kind: "HOTEL", userId: null, hotelId: HOTEL, roles: [AuthRole.HOTEL] });
  });

  it("fails closed with the standard envelope when a staff token carries no hotel", () => {
    const { next, res } = run({ id: USER, roles: [UserRole.EMPLOYEE] });
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, meta: { code: "LEAVE_NO_HOTEL_SCOPE" } }),
    );
  });

  it("rejects a hotelId that is not an ObjectId", () => {
    const { next, res } = run({ id: USER, roles: [UserRole.MANAGER], hotelId: "{$ne:null}" });
    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ meta: { code: "LEAVE_NO_HOTEL_SCOPE" } }));
  });

  it("returns 401 when the auth middleware did not populate a user", () => {
    const { next, res } = run(undefined);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ meta: { code: "UNAUTHENTICATED" } }));
  });
});

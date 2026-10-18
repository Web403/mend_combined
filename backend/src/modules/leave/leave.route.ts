// ─────────────────────────────────────────────────────────────────────────────
// modules/leave/leave.route.ts
//
// Mounted at /api/v1/leave, behind the global JWT auth middleware.
//
// Leave requests (employee-initiated absences)
//   POST   /requests                  employee   submit a leave request
//   GET    /requests/mine             employee   list own requests
//   PATCH  /requests/:id/cancel       employee   withdraw own pending / not-yet-started approved leave
//   GET    /requests                  manager    list all requests in the hotel (filterable)
//   GET    /requests/:id              owner or manager
//   PATCH  /requests/:id/approve      manager    approve a pending request
//   PATCH  /requests/:id/reject       manager    reject a pending request (note required)
//
// Day offs (manager-scheduled non-working days)
//   POST   /offs                      manager    assign offs to one or many employees
//   GET    /offs                      manager    list offs in a date window
//   GET    /offs/mine                 employee   own offs
//   DELETE /offs/:id                  manager    remove an off
//
// Every route runs resolveLeaveActor first. Authorization is role-based (see
// leave.constants.ts) and tenant-scoped from the JWT. The X-Hotel-Id header is not
// used for this module.
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from "express";
import { DayOffController, LeaveRequestController } from "./leave.controller";
import { resolveLeaveActor } from "./leave.actor";

const router = Router();
const requests = new LeaveRequestController();
const offs = new DayOffController();

// Named paths before parameterised ones so "mine" is never read as an id.
router.post("/requests", resolveLeaveActor, requests.createRequest.bind(requests));
router.get("/requests/mine", resolveLeaveActor, requests.listMyRequests.bind(requests));
router.get("/requests", resolveLeaveActor, requests.listRequests.bind(requests));
router.get("/requests/:id", resolveLeaveActor, requests.getRequest.bind(requests));
router.patch("/requests/:id/cancel", resolveLeaveActor, requests.cancelRequest.bind(requests));
router.patch("/requests/:id/approve", resolveLeaveActor, requests.approveRequest.bind(requests));
router.patch("/requests/:id/reject", resolveLeaveActor, requests.rejectRequest.bind(requests));

router.post("/offs", resolveLeaveActor, offs.assignDayOffs.bind(offs));
router.get("/offs/mine", resolveLeaveActor, offs.listMyDayOffs.bind(offs));
router.get("/offs", resolveLeaveActor, offs.listDayOffs.bind(offs));
router.delete("/offs/:id", resolveLeaveActor, offs.deleteDayOff.bind(offs));

export default router;

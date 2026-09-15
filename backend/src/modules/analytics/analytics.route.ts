import { Router } from "express";
import { AnalyticsController } from "./analytics.controller";
import { adminAuthMiddleware } from "../../core/middleware/admin.middleware";

const router = Router();
const controller = new AnalyticsController();

// MendAdmin-only analytics summary.
// Optional hotelId query param will scope the summary to that hotel.
// Use ?format=csv to download CSV.
router.get(
  "/admin/summary",
//   adminAuthMiddleware,
  controller.getAdminSummary.bind(controller)
);

// Hotel dashboard endpoint
// GET /analytics/dashboard/:hotelId
router.get("/dashboard/:hotelId", controller.getDashboard.bind(controller));

export default router;

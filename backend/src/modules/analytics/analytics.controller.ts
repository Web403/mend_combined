import { Request, Response } from "express";
import { AnalyticsService, AdminAnalyticsSummary } from "./analytics.service";
import { successResponse, errorResponse } from "../../core/utils/ApiResponse";

const service = new AnalyticsService();

export class AnalyticsController {
  async getAdminSummary(req: Request, res: Response): Promise<void> {
    try {
      const hotelId = (req.query.hotelId as string | undefined)?.trim() || undefined;
      const format = (req.query.format as string | undefined)?.toLowerCase();

      const summary = await service.getAdminSummary(hotelId);

      if (format === "csv") {
        res.header("Content-Type", "text/csv");
        res.send(this.toCsv(summary));
        return;
      }

      res.json(successResponse(summary, "Mend admin analytics summary retrieved successfully"));
    } catch (error: any) {
      res.status(500).json(errorResponse(error?.message ?? "Failed to retrieve analytics summary"));
    }
  }

  async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      const { hotelId } = req.params as { hotelId?: string };

      if (!hotelId) {
        res.status(400).json(errorResponse("hotelId parameter is required"));
        return;
      }

      const dashboard = await service.getHotelDashboard(hotelId);
      res.json(successResponse(dashboard, "Hotel dashboard retrieved successfully"));
    } catch (error: any) {
      res.status(500).json(errorResponse(error?.message ?? "Failed to retrieve dashboard"));
    }
  }

  private toCsv(summary: AdminAnalyticsSummary): string {
    const rows = Object.entries(summary).map(
      ([key, value]) => `${this.escapeCsv(key)},${this.escapeCsv(String(value ?? ""))}`
    );
    return ["metric,value", ...rows].join("\n");
  }

  private escapeCsv(value: string): string {
    if (value.includes(",") || value.includes("\n") || value.includes('"')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}

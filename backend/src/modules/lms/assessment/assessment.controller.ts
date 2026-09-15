import { Response, NextFunction } from "express";
import { AssessmentService } from "./assessment.service";
import { ApiResponse } from "../../../core/utils/ApiResponse";
import { resolveLmsHotelId } from "../../../core/utils/resolve-hotel-id";
import { getString } from "../../../core/utils/string.helper";
import { AuthenticatedRequest } from "../../../core/middleware/auth.middleware";

const assessmentService = new AssessmentService();

export class AssessmentController {
  // ─── Assessment CRUD ─────────────────────────────────
  static async createAssessment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const hotelId = resolveLmsHotelId(req);
      const assessment = await assessmentService.createAssessment(
        req.body,
        hotelId
      );
      res.status(201).json(ApiResponse.success("Assessment created", assessment));
    } catch (error) {
      next(error);
    }
  }

  static async getAssessmentById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const hotelId = resolveLmsHotelId(req);
      const includeQuestions = req.query.includeQuestions === "true";
      const assessment = await assessmentService.getAssessmentById(
        getString(req.params.id) ?? "",
        hotelId,
        includeQuestions
      );
      res.json(ApiResponse.success("Assessment fetched", assessment));
    } catch (error) {
      next(error);
    }
  }

  static async getAssessmentByModule(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const hotelId = resolveLmsHotelId(req);
      const assessment = await assessmentService.getAssessmentByModule(
        getString(req.params.moduleId) ?? "",
        hotelId
      );
      res.json(ApiResponse.success("Assessment fetched", assessment));
    } catch (error) {
      next(error);
    }
  }

  static async updateAssessment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const hotelId = resolveLmsHotelId(req);
      const assessment = await assessmentService.updateAssessment(
        getString(req.params.id) ?? "",
        hotelId,
        req.body
      );
      res.json(ApiResponse.success("Assessment updated", assessment));
    } catch (error) {
      next(error);
    }
  }

  static async deleteAssessment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const hotelId = resolveLmsHotelId(req);
      await assessmentService.deleteAssessment(getString(req.params.id) ?? "", hotelId);
      res.json(ApiResponse.success("Assessment deleted"));
    } catch (error) {
      next(error);
    }
  }

  // ─── Questions ───────────────────────────────────────
  static async addQuestion(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const hotelId = resolveLmsHotelId(req);
      const question = await assessmentService.addQuestion(req.body, hotelId);
      res.status(201).json(ApiResponse.success("Question added", question));
    } catch (error) {
      next(error);
    }
  }

  static async addBulkQuestions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const hotelId = resolveLmsHotelId(req);
      const questions = await assessmentService.addBulkQuestions(
        getString(req.params.assessmentId) ?? "",
        req.body.questions,
        hotelId
      );
      res.status(201).json(ApiResponse.success("Questions added", questions));
    } catch (error) {
      next(error);
    }
  }

  static async getQuestions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const hotelId = resolveLmsHotelId(req);
      const questions = await assessmentService.getQuestions(
        getString(req.params.assessmentId) ?? "",
        hotelId
      );
      res.json(ApiResponse.success("Questions fetched", questions));
    } catch (error) {
      next(error);
    }
  }

  static async updateQuestion(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const hotelId = resolveLmsHotelId(req);
      const question = await assessmentService.updateQuestion(
        getString(req.params.id) ?? "",
        hotelId,
        req.body
      );
      res.json(ApiResponse.success("Question updated", question));
    } catch (error) {
      next(error);
    }
  }

  static async deleteQuestion(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const hotelId = resolveLmsHotelId(req);
      await assessmentService.deleteQuestion(getString(req.params.id) ?? "", hotelId);
      res.json(ApiResponse.success("Question deleted"));
    } catch (error) {
      next(error);
    }
  }

  // ─── Quiz Taking ─────────────────────────────────────
  static async startQuiz(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const hotelId = resolveLmsHotelId(req);
      const userId = req.user?.id ?? "";
      const result = await assessmentService.startQuiz(
        getString(req.params.assessmentId) ?? "",
        userId,
        hotelId
      );
      res.json(ApiResponse.success("Quiz started", result));
    } catch (error) {
      next(error);
    }
  }

  static async submitQuiz(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const hotelId = resolveLmsHotelId(req);
      const userId = req.user?.id ?? "";
      const attempt = await assessmentService.submitQuiz(
        req.body,
        userId,
        hotelId
      );
      res.json(ApiResponse.success("Quiz submitted", attempt));
    } catch (error) {
      next(error);
    }
  }

  static async getAttemptResult(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const hotelId = resolveLmsHotelId(req);
      const attempt = await assessmentService.getAttemptResult(
        getString(req.params.attemptId) ?? "",
        hotelId
      );
      res.json(ApiResponse.success("Attempt result fetched", attempt));
    } catch (error) {
      next(error);
    }
  }

  static async getUserAttempts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const hotelId = resolveLmsHotelId(req);
      const userId = req.user?.id ?? "";
      const result = await assessmentService.getUserAttempts(
        userId,
        getString(req.params.assessmentId) ?? "",
        hotelId
      );
      res.json(ApiResponse.success("Attempts fetched", result));
    } catch (error) {
      next(error);
    }
  }
}
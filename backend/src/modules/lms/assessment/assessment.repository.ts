import { Types, QueryFilter } from "mongoose";
import { Assessment, AssessmentQuestion } from "./assessment.model";
import { AssessmentAttempt } from "./assessment-attempt.model";
import {
  IAssessmentDoc,
  IAssessmentQuestionDoc,
  IAssessmentAttemptDoc,
  IAssessmentAttemptFilters,
} from "../../../shared/interfaces/lms";

// ─── Assessment Repository ──────────────────────────────
export class AssessmentRepository {
  async create(data: Partial<IAssessmentDoc>): Promise<IAssessmentDoc> {
    return Assessment.create(data);
  }

  async findById(
    id: string,
    hotelId: string | Types.ObjectId,
    populate = false
  ): Promise<IAssessmentDoc | null> {
    const query = Assessment.findOne({ _id: id, hotel: hotelId });
    if (populate) {
      query.populate({
        path: "questions",
        match: { isActive: true },
        options: { sort: { orderIndex: 1 } },
      });
    }
    return query;
  }

  async findByModule(
    moduleId: string,
    hotelId: string | Types.ObjectId
  ): Promise<IAssessmentDoc | null> {
    return Assessment.findOne({
      module: moduleId,
      hotel: hotelId,
      isActive: true,
    });
  }

  async update(
    id: string,
    hotelId: string | Types.ObjectId,
    data: Partial<IAssessmentDoc>
  ): Promise<IAssessmentDoc | null> {
    return Assessment.findOneAndUpdate(
      { _id: id, hotel: hotelId },
      { $set: data },
      { new: true, runValidators: true }
    );
  }

  async delete(
    id: string,
    hotelId: string | Types.ObjectId
  ): Promise<IAssessmentDoc | null> {
    return Assessment.findOneAndDelete({ _id: id, hotel: hotelId });
  }

  async deleteByModule(moduleId: string, hotelId: string | Types.ObjectId): Promise<void> {
    await Assessment.deleteMany({ module: moduleId, hotel: hotelId });
  }

  async deleteByCourse(courseId: string, hotelId: string | Types.ObjectId): Promise<void> {
    await Assessment.deleteMany({ course: courseId, hotel: hotelId });
  }
}

// ─── Assessment Question Repository ─────────────────────
export class AssessmentQuestionRepository {
  async create(data: Partial<IAssessmentQuestionDoc>): Promise<IAssessmentQuestionDoc> {
    return AssessmentQuestion.create(data);
  }

  async createMany(data: Partial<IAssessmentQuestionDoc>[]): Promise<IAssessmentQuestionDoc[]> {
    const created = await AssessmentQuestion.insertMany(data as any);
    return created as unknown as IAssessmentQuestionDoc[];
  }

  async findById(
    id: string,
    hotelId: string | Types.ObjectId
  ): Promise<IAssessmentQuestionDoc | null> {
    return AssessmentQuestion.findOne({ _id: id, hotel: hotelId });
  }

  async findByAssessment(
    assessmentId: string,
    hotelId: string | Types.ObjectId,
    onlyActive = true
  ): Promise<IAssessmentQuestionDoc[]> {
    const filter: QueryFilter<IAssessmentQuestionDoc> = {
      assessment: assessmentId,
      hotel: hotelId,
    };
    if (onlyActive) filter.isActive = true;
    return AssessmentQuestion.find(filter).sort({ orderIndex: 1 });
  }

  // Fetch questions WITHOUT correct answers (for quiz taking)
  async findForQuizTaking(
    assessmentId: string,
    hotelId: string | Types.ObjectId,
    shuffle = false
  ): Promise<IAssessmentQuestionDoc[]> {
    const questions = await AssessmentQuestion.find({
      assessment: assessmentId,
      hotel: hotelId,
      isActive: true,
    })
      .select("-options.isCorrect -correctOrder -explanation")
      .sort(shuffle ? undefined : { orderIndex: 1 })
      .lean();

    if (shuffle) {
      // Fisher-Yates shuffle
      for (let i = questions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questions[i], questions[j]] = [questions[j], questions[i]];
      }
    }

    return questions as IAssessmentQuestionDoc[];
  }

  async update(
    id: string,
    hotelId: string | Types.ObjectId,
    data: Partial<IAssessmentQuestionDoc>
  ): Promise<IAssessmentQuestionDoc | null> {
    return AssessmentQuestion.findOneAndUpdate(
      { _id: id, hotel: hotelId },
      { $set: data },
      { new: true, runValidators: true }
    );
  }

  async delete(
    id: string,
    hotelId: string | Types.ObjectId
  ): Promise<IAssessmentQuestionDoc | null> {
    return AssessmentQuestion.findOneAndDelete({ _id: id, hotel: hotelId });
  }

  async deleteByAssessment(
    assessmentId: string,
    hotelId: string | Types.ObjectId
  ): Promise<number> {
    const result = await AssessmentQuestion.deleteMany({
      assessment: assessmentId,
      hotel: hotelId,
    });
    return result.deletedCount;
  }

  async countByAssessment(assessmentId: string | Types.ObjectId): Promise<number> {
    return AssessmentQuestion.countDocuments({
      assessment: assessmentId,
      isActive: true,
    });
  }

  async countByCourse(courseId: string | Types.ObjectId): Promise<number> {
    return AssessmentQuestion.countDocuments({
      course: courseId,
      isActive: true,
    });
  }

  async getNextOrderIndex(assessmentId: string | Types.ObjectId): Promise<number> {
    const last = await AssessmentQuestion.findOne({ assessment: assessmentId })
      .sort({ orderIndex: -1 })
      .select("orderIndex")
      .lean();
    return (last?.orderIndex ?? 0) + 1;
  }
}

// ─── Assessment Attempt Repository ──────────────────────
export class AssessmentAttemptRepository {
  async create(data: Partial<IAssessmentAttemptDoc>): Promise<IAssessmentAttemptDoc> {
    return AssessmentAttempt.create(data);
  }

  async findById(
    id: string,
    hotelId: string | Types.ObjectId
  ): Promise<IAssessmentAttemptDoc | null> {
    return AssessmentAttempt.findOne({ _id: id, hotel: hotelId })
      .populate("assessment", "title passingPercentage showExplanationAfterSubmit")
      .populate("answers.question", "questionText explanation options");
  }

  async findByUser(
    userId: string,
    hotelId: string | Types.ObjectId,
    filters: IAssessmentAttemptFilters
  ): Promise<{ attempts: IAssessmentAttemptDoc[]; total: number }> {
    const { assessment, module, course, passed, page = 1, limit = 20 } = filters;

    const filter: QueryFilter<IAssessmentAttemptDoc> = {
      user: userId,
      hotel: hotelId,
    };

    if (assessment) filter.assessment = assessment;
    if (module) filter.module = module;
    if (course) filter.course = course;
    if (passed !== undefined) filter.passed = passed;

    const skip = (page - 1) * limit;

    const [attempts, total] = await Promise.all([
      AssessmentAttempt.find(filter)
        .populate("assessment", "title")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AssessmentAttempt.countDocuments(filter),
    ]);

    return { attempts: attempts as IAssessmentAttemptDoc[], total };
  }

  async getLatestAttempt(
    userId: string,
    assessmentId: string,
    hotelId: string | Types.ObjectId
  ): Promise<IAssessmentAttemptDoc | null> {
    return AssessmentAttempt.findOne({
      user: userId,
      assessment: assessmentId,
      hotel: hotelId,
    })
      .sort({ attemptNumber: -1 })
      .lean() as Promise<IAssessmentAttemptDoc | null>;
  }

  async getAttemptCount(
    userId: string,
    assessmentId: string
  ): Promise<number> {
    return AssessmentAttempt.countDocuments({
      user: userId,
      assessment: assessmentId,
    });
  }

  async getBestAttempt(
    userId: string,
    assessmentId: string,
    hotelId: string | Types.ObjectId
  ): Promise<IAssessmentAttemptDoc | null> {
    return AssessmentAttempt.findOne({
      user: userId,
      assessment: assessmentId,
      hotel: hotelId,
    })
      .sort({ scorePercentage: -1 })
      .lean() as Promise<IAssessmentAttemptDoc | null>;
  }

  async hasPassedAssessment(
    userId: string,
    assessmentId: string
  ): Promise<boolean> {
    const attempt = await AssessmentAttempt.findOne({
      user: userId,
      assessment: assessmentId,
      passed: true,
    })
      .select("_id")
      .lean();
    return !!attempt;
  }
}
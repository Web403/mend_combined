import { Types } from "mongoose";
import {
  AssessmentRepository,
  AssessmentQuestionRepository,
  AssessmentAttemptRepository,
} from "./assessment.repository";
import {
  CourseRepository,
  ModuleRepository,
} from "../course/course.repository";
import { EnrollmentRepository } from "../enrollment/enrollment.repository";
import {
  IAssessmentDoc,
  IAssessmentQuestionDoc,
  IAssessmentAttemptDoc,
  IQuestionOption,
  IAttemptAnswer,
} from "../../../shared/interfaces/lms";
import { QuestionType, EnrollmentStatus } from "../../../shared/enums/lms.enum";
import { ApiError } from "../../../core/utils/ApiResponse";
import slugify from "../../../core/utils/slugify";
import { v4 as uuidv4 } from "uuid";

const assessmentRepo = new AssessmentRepository();
const questionRepo = new AssessmentQuestionRepository();
const attemptRepo = new AssessmentAttemptRepository();
const courseRepo = new CourseRepository();
const moduleRepo = new ModuleRepository();
const enrollmentRepo = new EnrollmentRepository();

export class AssessmentService {
  // ─── Assessment CRUD ─────────────────────────────────
  async createAssessment(
    data: {
      moduleId: string;
      courseId: string;
      title: string;
      passingPercentage?: number;
      maxAttempts?: number;
      timeLimitMinutes?: number;
      shuffleQuestions?: boolean;
      shuffleOptions?: boolean;
      showExplanationAfterSubmit?: boolean;
    },
    hotelId: string | Types.ObjectId
  ): Promise<IAssessmentDoc> {
    const module = await moduleRepo.findById(data.moduleId, hotelId);
    if (!module) throw ApiError.notFound("Module not found");

    // Check if assessment already exists for this module
    const existing = await assessmentRepo.findByModule(data.moduleId, hotelId);
    if (existing) {
      throw ApiError.conflict("Assessment already exists for this module");
    }

    const slug = slugify(data.title, { lower: true, strict: true });

    return assessmentRepo.create({
      module: new Types.ObjectId(data.moduleId),
      course: new Types.ObjectId(data.courseId),
      hotel: hotelId as Types.ObjectId,
      title: data.title,
      slug,
      passingPercentage: data.passingPercentage ?? 70,
      maxAttempts: data.maxAttempts ?? 0,
      timeLimitMinutes: data.timeLimitMinutes ?? 0,
      shuffleQuestions: data.shuffleQuestions ?? false,
      shuffleOptions: data.shuffleOptions ?? false,
      showExplanationAfterSubmit: data.showExplanationAfterSubmit ?? true,
    });
  }

  async getAssessmentById(
    id: string,
    hotelId: string | Types.ObjectId,
    includeQuestions = false
  ): Promise<IAssessmentDoc> {
    const assessment = await assessmentRepo.findById(id, hotelId, includeQuestions);
    if (!assessment) throw ApiError.notFound("Assessment not found");
    return assessment;
  }

  async getAssessmentByModule(
    moduleId: string,
    hotelId: string | Types.ObjectId
  ): Promise<IAssessmentDoc | null> {
    return assessmentRepo.findByModule(moduleId, hotelId);
  }

  async updateAssessment(
    id: string,
    hotelId: string | Types.ObjectId,
    data: Partial<IAssessmentDoc>
  ): Promise<IAssessmentDoc> {
    if (data.title) {
      data.slug = slugify(data.title as string, { lower: true, strict: true });
    }
    const updated = await assessmentRepo.update(id, hotelId, data);
    if (!updated) throw ApiError.notFound("Assessment not found");
    return updated;
  }

  async deleteAssessment(
    id: string,
    hotelId: string | Types.ObjectId
  ): Promise<void> {
    const assessment = await assessmentRepo.findById(id, hotelId);
    if (!assessment) throw ApiError.notFound("Assessment not found");

    // Delete all questions
    await questionRepo.deleteByAssessment(id, hotelId);
    await assessmentRepo.delete(id, hotelId);

    // Recalculate counts
    await moduleRepo.incrementQuizQuestionCount(assessment.module, -assessment.totalQuestions);
    await courseRepo.recalculateCounts(assessment.course);
  }

  // ─── Questions CRUD ──────────────────────────────────
  async addQuestion(
    data: {
      assessmentId: string;
      questionText: string;
      questionType?: QuestionType;
      options: { text: string; isCorrect: boolean }[];
      correctOrder?: string[];
      explanation?: string;
      points?: number;
    },
    hotelId: string | Types.ObjectId
  ): Promise<IAssessmentQuestionDoc> {
    const assessment = await assessmentRepo.findById(data.assessmentId, hotelId);
    if (!assessment) throw ApiError.notFound("Assessment not found");

    const orderIndex = await questionRepo.getNextOrderIndex(data.assessmentId);

    // Generate optionIds
    const options: IQuestionOption[] = data.options.map((opt, idx) => ({
      optionId: uuidv4(),
      text: opt.text,
      isCorrect: opt.isCorrect,
      sortOrder: idx,
    }));

    const question = await questionRepo.create({
      assessment: new Types.ObjectId(data.assessmentId),
      module: assessment.module,
      course: assessment.course,
      hotel: hotelId as Types.ObjectId,
      questionText: data.questionText,
      questionType: data.questionType || QuestionType.MULTIPLE_CHOICE,
      options,
      correctOrder: data.correctOrder || [],
      explanation: data.explanation || "",
      orderIndex,
      points: data.points || 1,
    });

    // Update counts
    const newCount = await questionRepo.countByAssessment(data.assessmentId);
    await assessmentRepo.update(data.assessmentId, hotelId, {
      totalQuestions: newCount,
    } as Partial<IAssessmentDoc>);
    await moduleRepo.incrementQuizQuestionCount(assessment.module, 1);
    await courseRepo.incrementQuizQuestionCount(assessment.course, 1);

    return question;
  }

  async addBulkQuestions(
    assessmentId: string,
    questions: {
      questionText: string;
      questionType?: QuestionType;
      options: { text: string; isCorrect: boolean }[];
      correctOrder?: string[];
      explanation?: string;
      points?: number;
    }[],
    hotelId: string | Types.ObjectId
  ): Promise<IAssessmentQuestionDoc[]> {
    const assessment = await assessmentRepo.findById(assessmentId, hotelId);
    if (!assessment) throw ApiError.notFound("Assessment not found");

    let currentOrder = await questionRepo.getNextOrderIndex(assessmentId);

    const questionsData = questions.map((q) => {
      const options: IQuestionOption[] = q.options.map((opt, idx) => ({
        optionId: uuidv4(),
        text: opt.text,
        isCorrect: opt.isCorrect,
        sortOrder: idx,
      }));

      return {
        assessment: new Types.ObjectId(assessmentId),
        module: assessment.module,
        course: assessment.course,
        hotel: hotelId as Types.ObjectId,
        questionText: q.questionText,
        questionType: q.questionType || QuestionType.MULTIPLE_CHOICE,
        options,
        correctOrder: q.correctOrder || [],
        explanation: q.explanation || "",
        orderIndex: currentOrder++,
        points: q.points || 1,
      };
    });

    const created = await questionRepo.createMany(questionsData);

    // Update counts
    const newCount = await questionRepo.countByAssessment(assessmentId);
    await assessmentRepo.update(assessmentId, hotelId, {
      totalQuestions: newCount,
    } as Partial<IAssessmentDoc>);

    await courseRepo.recalculateCounts(assessment.course);

    return created;
  }

  async getQuestions(
    assessmentId: string,
    hotelId: string | Types.ObjectId
  ): Promise<IAssessmentQuestionDoc[]> {
    return questionRepo.findByAssessment(assessmentId, hotelId);
  }

  async updateQuestion(
    id: string,
    hotelId: string | Types.ObjectId,
    data: Partial<IAssessmentQuestionDoc>
  ): Promise<IAssessmentQuestionDoc> {
    // If updating options, generate optionIds for new ones
    if (data.options) {
      data.options = (data.options as any[]).map((opt: any, idx: number) => ({
        optionId: opt.optionId || uuidv4(),
        text: opt.text,
        isCorrect: opt.isCorrect,
        sortOrder: opt.sortOrder ?? idx,
      }));
    }

    const updated = await questionRepo.update(id, hotelId, data);
    if (!updated) throw ApiError.notFound("Question not found");
    return updated;
  }

  async deleteQuestion(
    id: string,
    hotelId: string | Types.ObjectId
  ): Promise<void> {
    const question = await questionRepo.findById(id, hotelId);
    if (!question) throw ApiError.notFound("Question not found");

    await questionRepo.delete(id, hotelId);

    // Update counts
    const newCount = await questionRepo.countByAssessment(
      question.assessment.toString()
    );
    await assessmentRepo.update(question.assessment.toString(), hotelId, {
      totalQuestions: newCount,
    } as Partial<IAssessmentDoc>);
    await moduleRepo.incrementQuizQuestionCount(question.module, -1);
    await courseRepo.incrementQuizQuestionCount(question.course, -1);
  }

  // ─── Quiz Taking & Attempt ──────────────────────────
  async startQuiz(
    assessmentId: string,
    userId: string,
    hotelId: string | Types.ObjectId
  ): Promise<{
    assessment: IAssessmentDoc;
    questions: IAssessmentQuestionDoc[];
    attemptNumber: number;
  }> {
    const assessment = await assessmentRepo.findById(assessmentId, hotelId);
    if (!assessment) throw ApiError.notFound("Assessment not found");

    // Check max attempts
    if (assessment.maxAttempts > 0) {
      const attemptCount = await attemptRepo.getAttemptCount(userId, assessmentId);
      if (attemptCount >= assessment.maxAttempts) {
        throw ApiError.forbidden("Maximum number of attempts reached");
      }
    }

    // Get questions without answers
    const questions = await questionRepo.findForQuizTaking(
      assessmentId,
      hotelId,
      assessment.shuffleQuestions
    );

    const attemptCount = await attemptRepo.getAttemptCount(userId, assessmentId);

    return {
      assessment,
      questions,
      attemptNumber: attemptCount + 1,
    };
  }

  async submitQuiz(
    data: {
      assessmentId: string;
      answers: { questionId: string; selectedOptionIds: string[] }[];
    },
    userId: string,
    hotelId: string | Types.ObjectId
  ): Promise<IAssessmentAttemptDoc> {
    const assessment = await assessmentRepo.findById(data.assessmentId, hotelId);
    if (!assessment) throw ApiError.notFound("Assessment not found");

    // Check max attempts
    if (assessment.maxAttempts > 0) {
      const attemptCount = await attemptRepo.getAttemptCount(
        userId,
        data.assessmentId
      );
      if (attemptCount >= assessment.maxAttempts) {
        throw ApiError.forbidden("Maximum number of attempts reached");
      }
    }

    // Get all questions with correct answers
    const questions = await questionRepo.findByAssessment(
      data.assessmentId,
      hotelId
    );

    const questionsMap = new Map(
      questions.map((q) => [q._id.toString(), q])
    );

    // Grade each answer
    let correctCount = 0;
    let totalPoints = 0;
    let earnedPoints = 0;

    const gradedAnswers: IAttemptAnswer[] = data.answers.map((answer) => {
      const question = questionsMap.get(answer.questionId);
      if (!question) {
        return {
          question: new Types.ObjectId(answer.questionId),
          selectedOptionIds: answer.selectedOptionIds,
          isCorrect: false,
          pointsEarned: 0,
        };
      }

      totalPoints += question.points;
      let isCorrect = false;

      switch (question.questionType) {
        case QuestionType.MULTIPLE_CHOICE:
        case QuestionType.TRUE_FALSE: {
          const correctOption = question.options.find((o) => o.isCorrect);
          isCorrect =
            answer.selectedOptionIds.length === 1 &&
            answer.selectedOptionIds[0] === correctOption?.optionId;
          break;
        }
        case QuestionType.MULTI_SELECT: {
          const correctOptionIds = question.options
            .filter((o) => o.isCorrect)
            .map((o) => o.optionId)
            .sort();
          const selectedSorted = [...answer.selectedOptionIds].sort();
          isCorrect =
            correctOptionIds.length === selectedSorted.length &&
            correctOptionIds.every((id, i) => id === selectedSorted[i]);
          break;
        }
        case QuestionType.ORDERING: {
          isCorrect =
            question.correctOrder.length === answer.selectedOptionIds.length &&
            question.correctOrder.every(
              (id, i) => id === answer.selectedOptionIds[i]
            );
          break;
        }
      }

      if (isCorrect) {
        correctCount++;
        earnedPoints += question.points;
      }

      return {
        question: question._id as Types.ObjectId,
        selectedOptionIds: answer.selectedOptionIds,
        isCorrect,
        pointsEarned: isCorrect ? question.points : 0,
      };
    });

    const scorePercentage =
      questions.length > 0
        ? Math.round((correctCount / questions.length) * 100)
        : 0;

    const passed = scorePercentage >= assessment.passingPercentage;

    const attemptNumber =
      (await attemptRepo.getAttemptCount(userId, data.assessmentId)) + 1;

    const attempt = await attemptRepo.create({
      user: new Types.ObjectId(userId),
      assessment: new Types.ObjectId(data.assessmentId),
      module: assessment.module,
      course: assessment.course,
      hotel: hotelId as Types.ObjectId,
      attemptNumber,
      answers: gradedAnswers,
      totalQuestions: questions.length,
      correctAnswers: correctCount,
      scorePercentage,
      passed,
      startedAt: new Date(),
      completedAt: new Date(),
    });

    // If passed, update enrollment progress
    if (passed) {
      await this.updateEnrollmentOnQuizPass(
        userId,
        assessment.course.toString(),
        assessment.module.toString(),
        hotelId
      );
    }

    return attempt;
  }

  async getAttemptResult(
    attemptId: string,
    hotelId: string | Types.ObjectId
  ): Promise<IAssessmentAttemptDoc> {
    const attempt = await attemptRepo.findById(attemptId, hotelId);
    if (!attempt) throw ApiError.notFound("Attempt not found");
    return attempt;
  }

  async getUserAttempts(
    userId: string,
    assessmentId: string,
    hotelId: string | Types.ObjectId
  ): Promise<{ attempts: IAssessmentAttemptDoc[]; total: number }> {
    return attemptRepo.findByUser(userId, hotelId, {
      assessment: assessmentId,
      hotel: hotelId,
    });
  }

  // ─── Private Helpers ─────────────────────────────────
  private async updateEnrollmentOnQuizPass(
    userId: string,
    courseId: string,
    moduleId: string,
    hotelId: string | Types.ObjectId
  ): Promise<void> {
    const enrollment = await enrollmentRepo.findByUserAndCourse(
      userId,
      courseId,
      hotelId
    );

    if (!enrollment) return;

    // Mark module as completed
    await enrollmentRepo.markModuleCompleted(
      enrollment._id.toString(),
      hotelId,
      new Types.ObjectId(moduleId)
    );

    // Recalculate progress
    const courseData = await courseRepo.findById(courseId, hotelId);
    if (!courseData || courseData.totalModules === 0) return;

    const updatedEnrollment = await enrollmentRepo.findById(
      enrollment._id.toString(),
      hotelId
    );
    if (!updatedEnrollment) return;

    const progress = Math.round(
      (updatedEnrollment.completedModules.length / courseData.totalModules) * 100
    );

    const newStatus =
      progress >= 100
        ? EnrollmentStatus.COMPLETED
        : EnrollmentStatus.IN_PROGRESS;

    await enrollmentRepo.updateProgress(
      enrollment._id.toString(),
      hotelId,
      progress,
      newStatus
    );
  }
}
import mongoose, { Schema } from "mongoose";
import { QuestionType } from "../../../shared/enums/lms.enum";
import {
  IAssessmentDoc,
  IAssessmentQuestionDoc,
} from "../../../shared/interfaces/lms";

// ─── Assessment (Quiz) Schema ────────────────────────────
const assessmentSchema = new Schema<IAssessmentDoc>(
  {
    module: {
      type: Schema.Types.ObjectId,
      ref: "LmsModule",
      required: [true, "Module is required"],
      index: true,
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: "LmsCourse",
      required: [true, "Course is required"],
      index: true,
    },
    hotel: {
      type: Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Assessment title is required"],
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    totalQuestions: {
      type: Number,
      default: 0,
    },
    passingPercentage: {
      type: Number,
      default: 70,
      min: 0,
      max: 100,
    },
    maxAttempts: {
      type: Number,
      default: 0, // 0 = unlimited
    },
    timeLimitMinutes: {
      type: Number,
      default: 0, // 0 = no limit
    },
    shuffleQuestions: {
      type: Boolean,
      default: false,
    },
    shuffleOptions: {
      type: Boolean,
      default: false,
    },
    showExplanationAfterSubmit: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

assessmentSchema.virtual("questions", {
  ref: "LmsAssessmentQuestion",
  localField: "_id",
  foreignField: "assessment",
  options: { sort: { orderIndex: 1 } },
});

assessmentSchema.index({ hotel: 1, course: 1, module: 1 }, { unique: true });

export const Assessment = mongoose.model<IAssessmentDoc>(
  "LmsAssessment",
  assessmentSchema
);

// ─── Assessment Question Schema ──────────────────────────
const questionOptionSchema = new Schema(
  {
    optionId: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    isCorrect: {
      type: Boolean,
      default: false,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const assessmentQuestionSchema = new Schema<IAssessmentQuestionDoc>(
  {
    assessment: {
      type: Schema.Types.ObjectId,
      ref: "LmsAssessment",
      required: [true, "Assessment is required"],
      index: true,
    },
    module: {
      type: Schema.Types.ObjectId,
      ref: "LmsModule",
      required: true,
      index: true,
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: "LmsCourse",
      required: true,
      index: true,
    },
    hotel: {
      type: Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    },
    questionText: {
      type: String,
      required: [true, "Question text is required"],
      trim: true,
    },
    questionType: {
      type: String,
      enum: Object.values(QuestionType),
      default: QuestionType.MULTIPLE_CHOICE,
    },
    options: [questionOptionSchema],
    correctOrder: [{ type: String }],
    explanation: {
      type: String,
      default: "",
    },
    orderIndex: {
      type: Number,
      required: [true, "Order index is required"],
    },
    points: {
      type: Number,
      default: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

assessmentQuestionSchema.index(
  { assessment: 1, orderIndex: 1 },
  { unique: true }
);
assessmentQuestionSchema.index({ hotel: 1, course: 1 });

export const AssessmentQuestion = mongoose.model<IAssessmentQuestionDoc>(
  "LmsAssessmentQuestion",
  assessmentQuestionSchema
);
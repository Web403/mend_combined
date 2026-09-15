import mongoose, { Schema } from "mongoose";
import { IAssessmentAttemptDoc } from "../../../shared/interfaces/lms";

const attemptAnswerSchema = new Schema(
  {
    question: {
      type: Schema.Types.ObjectId,
      ref: "LmsAssessmentQuestion",
      required: true,
    },
    selectedOptionIds: [{ type: String }],
    isCorrect: {
      type: Boolean,
      default: false,
    },
    pointsEarned: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const assessmentAttemptSchema = new Schema<IAssessmentAttemptDoc>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    assessment: {
      type: Schema.Types.ObjectId,
      ref: "LmsAssessment",
      required: true,
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
    attemptNumber: {
      type: Number,
      required: true,
      default: 1,
    },
    answers: [attemptAnswerSchema],
    totalQuestions: {
      type: Number,
      required: true,
    },
    correctAnswers: {
      type: Number,
      default: 0,
    },
    scorePercentage: {
      type: Number,
      default: 0,
    },
    passed: {
      type: Boolean,
      default: false,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    timeTakenSeconds: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

assessmentAttemptSchema.index(
  { user: 1, assessment: 1, attemptNumber: 1 },
  { unique: true }
);
assessmentAttemptSchema.index({ user: 1, course: 1 });
assessmentAttemptSchema.index({ hotel: 1, course: 1, user: 1 });

export const AssessmentAttempt = mongoose.model<IAssessmentAttemptDoc>(
  "LmsAssessmentAttempt",
  assessmentAttemptSchema
);
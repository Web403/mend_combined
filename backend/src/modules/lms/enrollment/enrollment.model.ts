import mongoose, { Schema } from "mongoose";
import { EnrollmentStatus } from "../../../shared/enums/lms.enum";
import { IEnrollmentDoc } from "../../../shared/interfaces/lms";

const enrollmentSchema = new Schema<IEnrollmentDoc>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
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
    status: {
      type: String,
      enum: Object.values(EnrollmentStatus),
      default: EnrollmentStatus.APPLIED,
      index: true,
    },
    enrolledAt: {
      type: Date,
      default: null,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    progressPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    completedModules: [
      {
        type: Schema.Types.ObjectId,
        ref: "LmsModule",
      },
    ],
    completedLectures: [
      {
        type: Schema.Types.ObjectId,
        ref: "LmsLecture",
      },
    ],
    lastAccessedModule: {
      type: Schema.Types.ObjectId,
      ref: "LmsModule",
      default: null,
    },
    lastAccessedLecture: {
      type: Schema.Types.ObjectId,
      ref: "LmsLecture",
      default: null,
    },
    lastAccessedAt: {
      type: Date,
      default: null,
    },
    certificateUrl: {
      type: String,
      default: null,
    },
    certificateIssuedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

enrollmentSchema.index({ user: 1, course: 1 }, { unique: true });
enrollmentSchema.index({ hotel: 1, user: 1, status: 1 });
enrollmentSchema.index({ hotel: 1, course: 1, status: 1 });

export const Enrollment = mongoose.model<IEnrollmentDoc>(
  "LmsEnrollment",
  enrollmentSchema
);
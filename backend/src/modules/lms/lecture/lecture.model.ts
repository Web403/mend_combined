import mongoose, { Schema } from "mongoose";
import {
  CourseDifficulty,
  ContentBlockType,
} from "../../../shared/enums/lms.enum";
import { ILectureDoc } from "../../../shared/interfaces/lms";

const lessonStepSchema = new Schema(
  {
    stepNumber: {
      type: Number,
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const contentBlockSchema = new Schema(
  {
    blockType: {
      type: String,
      enum: Object.values(ContentBlockType),
      default: ContentBlockType.TEXT,
    },
    content: {
      type: String,
      default: "",
    },
    caption: {
      type: String,
      default: "",
    },
    orderIndex: {
      type: Number,
      default: 0,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { _id: false }
);

const lectureSchema = new Schema<ILectureDoc>(
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
      required: [true, "Lecture title is required"],
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    orderIndex: {
      type: Number,
      required: [true, "Order index is required"],
    },
    difficulty: {
      type: String,
      enum: Object.values(CourseDifficulty),
      default: CourseDifficulty.BEGINNER,
    },
    content: {
      type: String,
      required: [true, "Lecture content is required"],
    },
    steps: [lessonStepSchema],
    keyFigures: [
      {
        type: String,
        trim: true,
      },
    ],
    contentBlocks: [contentBlockSchema],
    isActive: {
      type: Boolean,
      default: true,
    },
    estimatedDurationMinutes: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

lectureSchema.index({ module: 1, orderIndex: 1 }, { unique: true });
lectureSchema.index({ course: 1, module: 1 });
lectureSchema.index({ hotel: 1, course: 1 });

export const Lecture = mongoose.model<ILectureDoc>("LmsLecture", lectureSchema);
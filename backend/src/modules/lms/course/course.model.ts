import mongoose, { Schema } from "mongoose";
import {
  CourseBadge,
  CourseStatus,
  CourseDifficulty,
} from "../../../shared/enums/lms.enum";
import { ICategoryDoc, ICourseDoc, IModuleDoc } from "../../../shared/interfaces/lms";

// ─── Category Schema ─────────────────────────────────────
const categorySchema = new Schema<ICategoryDoc>(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    icon: {
      type: String,
      default: null,
    },
    hotel: {
      type: Schema.Types.ObjectId,
      ref: "Hotel",
      // required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

categorySchema.index({ hotel: 1, slug: 1 }, { unique: true });
categorySchema.index({ hotel: 1, isActive: 1, sortOrder: 1 });

export const Category = mongoose.model<ICategoryDoc>("LmsCategory", categorySchema);

// ─── Course Schema ───────────────────────────────────────
const courseSchema = new Schema<ICourseDoc>(
  {
    title: {
      type: String,
      required: [true, "Course title is required"],
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "LmsCategory",
      required: [true, "Category is required"],
      index: true,
    },
    hotel: {
      type: Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    },
    description: {
      type: String,
      default: "",
    },
    coverImage: {
      type: String,
      default: null,
    },
    icon: {
      type: String,
      default: null,
    },
    totalModules: {
      type: Number,
      default: 0,
    },
    totalQuizQuestions: {
      type: Number,
      default: 0,
    },
    learningOutcomes: [
      {
        type: String,
        trim: true,
      },
    ],
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    badge: {
      type: String,
      enum: [...Object.values(CourseBadge), null],
      default: null,
    },
    status: {
      type: String,
      enum: Object.values(CourseStatus),
      default: CourseStatus.DRAFT,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    difficulty: {
      type: String,
      enum: Object.values(CourseDifficulty),
      default: CourseDifficulty.BEGINNER,
    },
    estimatedDurationMinutes: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

courseSchema.virtual("modules", {
  ref: "LmsModule",
  localField: "_id",
  foreignField: "course",
  options: { sort: { orderIndex: 1 } },
});

courseSchema.index({ hotel: 1, slug: 1 }, { unique: true });
courseSchema.index({ hotel: 1, category: 1, status: 1, isActive: 1 });
courseSchema.index({ hotel: 1, status: 1, isActive: 1, sortOrder: 1 });
courseSchema.index({ hotel: 1, tags: 1 });

export const Course = mongoose.model<ICourseDoc>("LmsCourse", courseSchema);

// ─── Module Schema ───────────────────────────────────────
const moduleSchema = new Schema<IModuleDoc>(
  {
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
      required: [true, "Module title is required"],
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    orderIndex: {
      type: Number,
      required: [true, "Order index is required"],
    },
    totalLessons: {
      type: Number,
      default: 0,
    },
    totalQuizQuestions: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    estimatedDurationMinutes: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

moduleSchema.virtual("lectures", {
  ref: "LmsLecture",
  localField: "_id",
  foreignField: "module",
  options: { sort: { orderIndex: 1 } },
});

moduleSchema.virtual("assessment", {
  ref: "LmsAssessment",
  localField: "_id",
  foreignField: "module",
  justOne: true,
});

moduleSchema.index({ course: 1, orderIndex: 1 }, { unique: true });
moduleSchema.index({ course: 1, slug: 1 }, { unique: true });
moduleSchema.index({ hotel: 1, course: 1 });

export const Module = mongoose.model<IModuleDoc>("LmsModule", moduleSchema);
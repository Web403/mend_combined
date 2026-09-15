// ─────────────────────────────────────────────────────────────────────────────
// modules/tasks/task.model.ts
// ─────────────────────────────────────────────────────────────────────────────

import mongoose, { Schema, model } from "mongoose";
import { ITask } from "../../shared/interfaces/task.d";
import { TaskPriority, TaskStatus, TaskType } from "../../shared/enums/task";

const TaskSchema = new Schema<ITask>(
  {
    id: { type: String, required: true, unique: true, index: true },
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    schemaVersion: { type: Number, default: 1 },

    assignedTo: {
      type: [mongoose.Types.ObjectId],
      ref: "users",
      required: true,
      index: true,
    },
    assignedBy: {
      type: mongoose.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: Object.values(TaskType),
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
    },
    dueTime: {
      type: String,
      required: true,
    },

    priority: {
      type: String,
      enum: Object.values(TaskPriority),
      default: TaskPriority.MEDIUM,
      index: true,
    },

    title: { type: String, required: true },
    description: { type: String },

    weight: { type: Number, required: true, default: 5, min: 1, max: 10 },

    status: {
      type: String,
      enum: Object.values(TaskStatus),
      default: TaskStatus.PENDING,
      index: true,
    },

    startedAt: { type: Date },
    completedAt: { type: Date },
    durationMinutes: { type: Number },

    taskDetail: {
      type: {
        taskData: [
          {
            userId: {
              type: mongoose.Types.ObjectId,
              ref:"User",
              required: true,
            },
            photos: [String],
            completed: { type: Number, default: 0 },
            status: {
              type:String,
              enum: Object.values(TaskStatus),
              default: TaskStatus.PENDING,
            },
            completedAt: { type: Date },
          },
        ],
        progress: { type: Number, default: 0 },
      },
    },

    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

// ── Compound indexes for common query patterns ────────────────────────────────
TaskSchema.index({ hotelId: 1, status: 1 });
TaskSchema.index({ hotelId: 1, assignedTo: 1, status: 1 });
TaskSchema.index({ hotelId: 1, assignedBy: 1 });
TaskSchema.index({ hotelId: 1, type: 1, status: 1 });
TaskSchema.index({ hotelId: 1, isDeleted: 1, createdAt: -1 });

export const TaskModel = model<ITask>("Task", TaskSchema);

import { Types } from "mongoose";
import { TaskModel } from "../modules/tasks/task.model";
import { createBaseFields } from "./utils";

export const seedTasks = async (
  hotelId: string,
  staffId: string,
  managerId: string
) => {
  await TaskModel.create({
    ...createBaseFields(hotelId, "TASK"),
    assignedTo: [staffId],
    assignedBy: managerId,
    type: "HOUSEKEEPING",
    title: "Room cleaning task",
    description: "Clean and sanitize the guest room after checkout.",
    weight: 3,
    status: "COMPLETED",
    startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    completedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    durationMinutes: 60
  });

  console.log("🧹 Tasks seeded");
};
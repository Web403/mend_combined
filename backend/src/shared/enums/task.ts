// ─────────────────────────────────────────────────────────────────────────────
// shared/enums/task.enum.ts
// ─────────────────────────────────────────────────────────────────────────────

export enum TaskStatus {
  PENDING = "PENDING",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum TaskType {
  HOUSEKEEPING = "HOUSEKEEPING",
  ROOM_SERVICE = "ROOM_SERVICE",
  MAINTENANCE = "MAINTENANCE",
  FRONT_DESK = "FRONT_DESK",
  FOOD_AND_BEVERAGE = "FOOD_AND_BEVERAGE",
  CONCIERGE = "CONCIERGE",
  SECURITY = "SECURITY",
  LAUNDRY = "LAUNDRY",
  OTHER = "OTHER",
}

export enum TaskPriority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  URGENT = "URGENT",
}
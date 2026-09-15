import { Schema, model } from "mongoose";
import { ISession } from "../../shared/interfaces";

const SessionSchema = new Schema<ISession>(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    hotelId: { type: String, index: true },
    hashedRefreshToken: { type: String, required: true },
    expiresAt: { type: Date, required: true }
  },
  { timestamps: true }
);

// Auto-remove expired sessions
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const SessionModel = model<ISession>("Session", SessionSchema);
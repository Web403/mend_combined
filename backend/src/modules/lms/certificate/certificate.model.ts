import mongoose, { Schema } from "mongoose";
import { ICertificateDoc } from "../../../shared/interfaces/lms";

const certificateSchema = new Schema<ICertificateDoc>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: "LmsCourse",
      required: true,
      index: true,
    },
    enrollment: {
      type: Schema.Types.ObjectId,
      ref: "LmsEnrollment",
      required: true,
      index: true,
    },
    hotel: {
      type: Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    },
    certificateNumber: {
      type: String,
      required: true,
      unique: true,
    },
    issueDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    templateUrl: {
      type: String,
      default: null,
    },
    certificateUrl: {
      type: String,
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

certificateSchema.index({ hotel: 1, user: 1 });
certificateSchema.index({ hotel: 1, course: 1 });

export const Certificate = mongoose.model<ICertificateDoc>(
  "LmsCertificate",
  certificateSchema
);

export const CertificateModel = Certificate;
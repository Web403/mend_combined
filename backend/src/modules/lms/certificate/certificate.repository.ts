import { Types } from "mongoose";
import { Certificate } from "./certificate.model";
import { ICertificateDoc } from "../../../shared/interfaces/lms";

export class CertificateRepository {
  async create(data: Partial<ICertificateDoc>): Promise<ICertificateDoc> {
    return Certificate.create(data);
  }

  async findById(
    id: string,
    hotelId: string | Types.ObjectId
  ): Promise<ICertificateDoc | null> {
    return Certificate.findOne({ _id: id, hotel: hotelId })
      .populate("user", "firstName lastName email")
      .populate("course", "title slug");
  }

  async findByNumber(certificateNumber: string): Promise<ICertificateDoc | null> {
    return Certificate.findOne({ certificateNumber })
      .populate("user", "firstName lastName email")
      .populate("course", "title slug");
  }

  async findByUser(
    userId: string,
    hotelId: string | Types.ObjectId
  ): Promise<ICertificateDoc[]> {
    return Certificate.find({ user: userId, hotel: hotelId })
      .populate("course", "title slug coverImage")
      .sort({ issueDate: -1 });
  }

  async findByEnrollment(
    enrollmentId: string,
    hotelId: string | Types.ObjectId
  ): Promise<ICertificateDoc | null> {
    return Certificate.findOne({ enrollment: enrollmentId, hotel: hotelId });
  }

  async exists(
    userId: string,
    courseId: string,
    hotelId: string | Types.ObjectId
  ): Promise<boolean> {
    const cert = await Certificate.findOne({
      user: userId,
      course: courseId,
      hotel: hotelId,
    })
      .select("_id")
      .lean();
    return !!cert;
  }
}
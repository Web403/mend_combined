import { PassportModel } from "../modules/passport/passport.model";
import { createBaseFields } from "./utils";

export const seedPassport = async (hotelId: string, userId: string) => {
  await PassportModel.create({
    ...createBaseFields(hotelId, "PASS"),
    userId,
    skills: ["Housekeeping", "Guest Service"],
    certifications: ["MEND_L1"],
    efficiencyScore: 85,
    complianceHistory: [
      { hotelId, score: 92 }
    ],
    careerProgression: [
      {
        title: "Trainee",
        from: new Date("2024-01-01"),
        to: new Date("2025-01-01")
      }
    ]
  });

  console.log("📘 Passport seeded");
};
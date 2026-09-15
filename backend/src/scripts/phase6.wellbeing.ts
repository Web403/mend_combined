import { WellbeingModel } from "../modules/wellbeing/wellbeing.model";
import { createBaseFields } from "./utils";

export const seedWellbeing = async (
  hotelId: string,
  userId: string
) => {
  await WellbeingModel.create({
    ...createBaseFields(hotelId, "WELL"),
    userId,
    rating: 4,
    sleepHours: 7,
    stressLevel: 2,
    fatigueScore: 25
  });

  console.log("💙 Wellbeing seeded");
};
import bcrypt from "bcryptjs";
import { HotelModel } from "../modules/hotel/hotel.model";
import { MonthlyEvents, PrimaryPainPoint, PropertyType } from "../shared/enums";
import { AuthRole } from "../shared/enums/common";

export const seedTenant = async () => {
  const hotelCode = "hotel_demo_001";

  let hotel = await HotelModel.findOne({ id: hotelCode });
  if (!hotel) {
    const passwordHash = await bcrypt.hash("Password@123", 10);

    hotel = await HotelModel.create({
      id: hotelCode,
      name: "Demo Hotel",
      contactPersonName: "Demo Manager",
      email: "hotel-demo@example.com",
      phoneNumber: "9999999999",
      paymentId: "PAY_DEMO_001",
      subscriptionAmount: 0,
      primaryPainPoint: PrimaryPainPoint.OPERATIONAL_EFFICIENCY,
      propertyType: PropertyType.BOUTIQUE_HOTEL,
      monthlyEvents: MonthlyEvents.ONE_TO_FIVE,
      staffStrength: 50,
      passwordHash,
      authRole: AuthRole.HOTEL
    });
  }
  // Otherwise just return hotelId for reference.

  console.log("🏨 Tenant ready:", hotelCode);
  return { hotelId: hotel._id.toString() };
};
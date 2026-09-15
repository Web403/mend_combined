import { IBaseDocument } from "../../shared/interfaces/base.types";

export interface ISOS extends IBaseDocument {
  userId: string;
  location: {
    type: "Point";
    coordinates: [number, number];
  };
  status: "OPEN" | "ESCALATED" | "RESOLVED";
  escalationLevel: number;
}
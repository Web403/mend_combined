import { IBaseDocument } from "../../shared/interfaces/base.types";

export interface IJob extends IBaseDocument {
  title: string;
  shiftPolicy: string;
  recoveryPolicy: string;
  certificationRequired: string;
  status: "OPEN" | "CLOSED" | "BLOCKED";
}
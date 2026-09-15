import { nanoid } from "nanoid";

export const createBaseFields = (hotelId: string, prefix: string) => ({
  id: `${prefix}_${nanoid(8)}`,
  hotelId,
  schemaVersion: 1
});
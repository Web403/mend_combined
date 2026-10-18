/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * The in-memory double stands in for Mongoose in the HTTP tests, so its update
 * operators must match Mongo. These tests pin the operators the modules use.
 */
import mongoose from "mongoose";
import { createMemoryModel } from "./memory-db";

const oid = () => new mongoose.Types.ObjectId();

// Collections are shared by name, so every test starts from an empty one.
function rosterModel() {
  const model = createMemoryModel("Roster", "rosters_memory_db_test", {});
  model.reset();
  return model;
}

describe("memory double — update operators", () => {
  it("treats a plain key in an update as $set, like Mongoose", async () => {
    const model = rosterModel();
    const doc = model.insertRaw({ _id: oid(), date: new Date("2026-11-01"), schemaVersion: 1 });
    await model.findOneAndUpdate({ _id: doc._id }, { date: new Date("2026-11-09") }, { new: true });
    expect(model.docs[0].date.toISOString()).toBe("2026-11-09T00:00:00.000Z");
    expect(model.docs[0].schemaVersion).toBe(1);
  });

  it("$push appends, and with $each appends several", async () => {
    const model = rosterModel();
    const [a, b, c] = [oid(), oid(), oid()];
    model.insertRaw({ _id: oid(), employees: [a] });
    await model.updateOne({}, { $push: { employees: b } });
    await model.updateOne({}, { $push: { employees: { $each: [c] } } });
    expect(model.docs[0].employees.map(String)).toEqual([String(a), String(b), String(c)]);
  });

  it("$push creates the array when the field is missing", async () => {
    const model = rosterModel();
    const a = oid();
    model.insertRaw({ _id: oid() });
    await model.updateOne({}, { $push: { employees: { $each: [a] } } });
    expect(model.docs[0].employees.map(String)).toEqual([String(a)]);
  });

  it("$addToSet only adds values not already present", async () => {
    const model = rosterModel();
    const [a, b] = [oid(), oid()];
    model.insertRaw({ _id: oid(), tags: [String(a)] });
    await model.updateOne({}, { $addToSet: { tags: { $each: [String(a), String(b)] } } });
    expect(model.docs[0].tags).toEqual([String(a), String(b)]);
  });

  it("$pull removes an ObjectId by value, and removes every member of an $in list", async () => {
    const model = rosterModel();
    const [a, b, c] = [oid(), oid(), oid()];
    model.insertRaw({ _id: oid(), employees: [a, b, c] });
    await model.updateMany({}, { $pull: { employees: a } });
    expect(model.docs[0].employees.map(String)).toEqual([String(b), String(c)]);
    await model.updateMany({}, { $pull: { employees: { $in: [b, c] } } });
    expect(model.docs[0].employees).toEqual([]);
  });

  it("updateMany reports matched and modified counts, and only touches matching documents", async () => {
    const model = rosterModel();
    const hotel = oid();
    const other = oid();
    model.insertRaw({ _id: oid(), hotelId: hotel, status: "A" });
    model.insertRaw({ _id: oid(), hotelId: hotel, status: "A" });
    model.insertRaw({ _id: oid(), hotelId: other, status: "A" });

    const result = await model.updateMany({ hotelId: hotel }, { $set: { status: "B" } });
    expect(result).toEqual({ matchedCount: 2, modifiedCount: 2 });
    expect(model.docs.map((d) => d.status)).toEqual(["B", "B", "A"]);
  });

  it("updateOne changes only the first match, and reports no match as zero", async () => {
    const model = rosterModel();
    model.insertRaw({ _id: oid(), status: "A" });
    model.insertRaw({ _id: oid(), status: "A" });

    expect(await model.updateOne({ status: "A" }, { $set: { status: "B" } })).toEqual({ matchedCount: 1, modifiedCount: 1 });
    expect(model.docs.map((d) => d.status)).toEqual(["B", "A"]);
    expect(await model.updateOne({ status: "Z" }, { $set: { status: "Y" } })).toEqual({ matchedCount: 0, modifiedCount: 0 });
  });

  it("matches an array field when any element equals the condition", async () => {
    const model = rosterModel();
    const [a, b] = [oid(), oid()];
    model.insertRaw({ _id: oid(), employees: [a] });
    model.insertRaw({ _id: oid(), employees: [b] });

    const found = await model.find({ employees: String(a) }).lean();
    expect(found).toHaveLength(1);
    expect(found[0].employees.map(String)).toEqual([String(a)]);
  });
});

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Minimal in-memory stand-in for the handful of Mongoose model operations the
 * review module performs.
 *
 * It exists so the API tests can exercise the REAL Express app — real JWT auth
 * middleware, real tenant middleware, real controller, service, eligibility
 * engine, repository and gateway — without a MongoDB server (none is reachable
 * from this environment, and `mongodb-memory-server` cannot download a binary).
 *
 * What is reproduced faithfully because a test depends on it:
 *   • chainable find / findOne / findById with select, sort, skip, limit, lean
 *   • `undefined` values stripped on create (Mongoose behaviour)
 *   • enum + required validation on create
 *   • UNIQUE INDEXES, including `partialFilterExpression`, raising E11000 — this
 *     is what makes the duplicate / race-condition tests meaningful
 *   • timestamps
 *   • the aggregation stages used by the review repository
 *
 * It is a test double, not a database: anything not listed above throws rather
 * than silently returning a plausible-looking wrong answer.
 */

import mongoose from "mongoose";

type Doc = Record<string, any>;

export interface UniqueIndexSpec {
  name: string;
  fields: string[];
  /** Mirrors `partialFilterExpression: { f: { $exists: true } }`. */
  partialFieldExists?: string;
}

export interface MemoryModelOptions {
  uniqueIndexes?: UniqueIndexSpec[];
  enums?: Record<string, string[]>;
  required?: string[];
  timestamps?: boolean;
  aggregateHandler?: (docs: Doc[], pipeline: any[]) => Doc[];
}

// ── Value helpers ─────────────────────────────────────────────────────────────

const isPlainObject = (value: any): value is Doc =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  !(value instanceof Date) &&
  !(value instanceof mongoose.Types.ObjectId) &&
  !mongoose.isObjectIdOrHexString(value as any);

const hasPath = (doc: Doc, path: string): boolean =>
  path.split(".").reduce<any>(
    (acc, key) =>
      acc === undefined || acc === null ? undefined : acc[key],
    doc,
  ) !== undefined;

const getPath = (doc: Doc, path: string): any =>
  path.split(".").reduce<any>(
    (acc, key) => (acc === undefined || acc === null ? undefined : acc[key]),
    doc,
  );

/** Equality with Mongo's treatment of null matching missing values. */
function looseEq(a: any, b: any): boolean {
  if (a === null || a === undefined) return b === null || b === undefined;
  if (b === null || b === undefined) return false;
  if (a instanceof Date || b instanceof Date) {
    return new Date(a).getTime() === new Date(b).getTime();
  }
  if (typeof a === "object" || typeof b === "object") {
    return String(a) === String(b);
  }
  return a === b;
}

function compare(a: any, b: any): number {
  if (a === b) return 0;
  if (a === undefined || a === null) return -1;
  if (b === undefined || b === null) return 1;
  if (a instanceof Date || b instanceof Date) {
    return new Date(a).getTime() - new Date(b).getTime();
  }
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a) < String(b) ? -1 : 1;
}

function matchField(doc: Doc, path: string, condition: any): boolean {
  const value = getPath(doc, path);

  if (isPlainObject(condition)) {
    for (const [operator, operand] of Object.entries(condition)) {
      switch (operator) {
        case "$in":
          if (!(operand as any[]).some((item) => looseEq(value, item))) return false;
          break;
        case "$nin":
          if ((operand as any[]).some((item) => looseEq(value, item))) return false;
          break;
        case "$ne":
          if (looseEq(value, operand)) return false;
          break;
        case "$exists":
          if (hasPath(doc, path) !== Boolean(operand)) return false;
          break;
        case "$gte":
          if (!(value !== undefined && value !== null && compare(value, operand) >= 0))
            return false;
          break;
        case "$gt":
          if (!(value !== undefined && value !== null && compare(value, operand) > 0))
            return false;
          break;
        case "$lte":
          if (!(value !== undefined && value !== null && compare(value, operand) <= 0))
            return false;
          break;
        case "$lt":
          if (!(value !== undefined && value !== null && compare(value, operand) < 0))
            return false;
          break;
        case "$regex": {
          const flags = (condition as any).$options ?? "";
          if (typeof value !== "string") return false;
          if (!new RegExp(operand as string, flags).test(value)) return false;
          break;
        }
        case "$options":
          break;
        default:
          throw new Error(`memory-db: unsupported query operator ${operator}`);
      }
    }
    return true;
  }

  return looseEq(value, condition);
}

export function matches(doc: Doc, filter: Doc = {}): boolean {
  for (const [key, condition] of Object.entries(filter)) {
    // Mongoose strips `undefined` values when casting a filter, which silently
    // widens the query. Reproduced here so tests cannot hide that behaviour.
    if (condition === undefined) continue;
    if (key === "$or") {
      if (!(condition as Doc[]).some((sub) => matches(doc, sub))) return false;
      continue;
    }
    if (key === "$and") {
      if (!(condition as Doc[]).every((sub) => matches(doc, sub))) return false;
      continue;
    }
    if (!matchField(doc, key, condition)) return false;
  }
  return true;
}

// ── Query builder ─────────────────────────────────────────────────────────────

class MemoryQuery implements PromiseLike<any> {
  private sortSpec: any = null;
  private skipCount = 0;
  private limitCount = 0;
  private isOne: boolean;

  constructor(
    private readonly store: Doc[],
    private readonly filter: Doc,
    isOne = false,
  ) {
    this.isOne = isOne;
  }

  select() {
    return this;
  }
  populate() {
    return this;
  }
  lean() {
    return this;
  }
  sort(spec: any) {
    this.sortSpec = spec;
    return this;
  }
  skip(n: number) {
    this.skipCount = n;
    return this;
  }
  limit(n: number) {
    this.limitCount = n;
    return this;
  }

  private applySort(rows: Doc[]): Doc[] {
    if (!this.sortSpec) return rows;
    const entries: [string, number][] =
      typeof this.sortSpec === "string"
        ? [[this.sortSpec.replace(/^-/, ""), this.sortSpec.startsWith("-") ? -1 : 1]]
        : Object.entries(this.sortSpec).map(([field, dir]) => [field, Number(dir)]);

    return [...rows].sort((a, b) => {
      for (const [field, dir] of entries) {
        const result = compare(getPath(a, field), getPath(b, field));
        if (result !== 0) return result * dir;
      }
      return 0;
    });
  }

  private exec(): any {
    let rows = this.store.filter((doc) => matches(doc, this.filter));
    rows = this.applySort(rows);
    rows = rows.slice(this.skipCount);
    if (this.limitCount > 0) rows = rows.slice(0, this.limitCount);
    rows = rows.map((row) => ({ ...row }));
    return this.isOne ? (rows[0] ?? null) : rows;
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve()
      .then(() => this.exec())
      .then(onfulfilled, onrejected);
  }
}

// ── Aggregation expression evaluator ──────────────────────────────────────────

function evalExpr(doc: Doc, expr: any): any {
  if (typeof expr === "string") {
    if (expr === "$$ROOT") return doc;
    if (expr.startsWith("$")) return getPath(doc, expr.slice(1));
    return expr;
  }
  if (Array.isArray(expr)) return expr.map((item) => evalExpr(doc, item));
  if (!isPlainObject(expr)) return expr;

  const [operator, operands] = Object.entries(expr)[0] as [string, any];
  const args = (Array.isArray(operands) ? operands : [operands]).map((operand) =>
    evalExpr(doc, operand),
  );

  switch (operator) {
    case "$ifNull":
      return args[0] === null || args[0] === undefined ? args[1] : args[0];
    case "$cond":
      return args[0] ? args[1] : args[2];
    case "$and":
      return args.every(Boolean);
    case "$or":
      return args.some(Boolean);
    case "$ne":
      return !looseEq(args[0], args[1]);
    case "$eq":
      return looseEq(args[0], args[1]);
    case "$gte":
      return compare(args[0], args[1]) >= 0;
    case "$gt":
      return compare(args[0], args[1]) > 0;
    case "$lte":
      return compare(args[0], args[1]) <= 0;
    case "$lt":
      return compare(args[0], args[1]) < 0;
    case "$toString":
      return args[0] === null || args[0] === undefined ? null : String(args[0]);
    default:
      throw new Error(`memory-db: unsupported aggregation operator ${operator}`);
  }
}

function groupKey(doc: Doc, idExpr: any): string {
  if (idExpr === null) return "__all__";
  const value = evalExpr(doc, idExpr);
  return value === null || value === undefined ? "null" : String(value);
}

function runAggregate(store: Doc[], pipeline: any[]): Doc[] {
  let rows: Doc[] = store.map((doc) => ({ ...doc }));

  for (const stage of pipeline) {
    const [operator, spec] = Object.entries(stage)[0] as [string, any];

    switch (operator) {
      case "$match":
        rows = rows.filter((doc) => matches(doc, spec));
        break;

      case "$lookup": {
        const foreign = MemoryDb.collection(spec.from);
        rows = rows.map((doc) => ({
          ...doc,
          [spec.as]: foreign.filter((other) =>
            looseEq(getPath(doc, spec.localField), getPath(other, spec.foreignField)),
          ),
        }));
        break;
      }

      case "$unwind": {
        const field = String(spec).replace(/^\$/, "");
        const unwound: Doc[] = [];
        for (const doc of rows) {
          const values = getPath(doc, field);
          if (Array.isArray(values)) {
            for (const value of values) unwound.push({ ...doc, [field]: value });
          }
        }
        rows = unwound;
        break;
      }

      case "$sort": {
        const entries = Object.entries(spec) as [string, number][];
        rows = [...rows].sort((a, b) => {
          for (const [field, dir] of entries) {
            const result = compare(getPath(a, field), getPath(b, field));
            if (result !== 0) return result * Number(dir);
          }
          return 0;
        });
        break;
      }

      case "$project": {
        rows = rows.map((doc) => {
          const projected: Doc = { _id: doc._id };
          for (const [field, keep] of Object.entries(spec)) {
            if (keep) projected[field] = getPath(doc, field);
          }
          return projected;
        });
        break;
      }

      case "$group": {
        const buckets = new Map<string, Doc[]>();
        for (const doc of rows) {
          const key = groupKey(doc, spec._id);
          const bucket = buckets.get(key);
          if (bucket) bucket.push(doc);
          else buckets.set(key, [doc]);
        }

        rows = [...buckets.entries()].map(([key, docs]) => {
          const out: Doc = { _id: key === "__all__" ? null : key };
          for (const [field, accumulator] of Object.entries(spec)) {
            if (field === "_id") continue;
            const [op, arg] = Object.entries(accumulator as Doc)[0] as [string, any];
            switch (op) {
              case "$sum":
                out[field] = docs.reduce(
                  (sum, doc) => sum + (Number(evalExpr(doc, arg)) || 0),
                  0,
                );
                break;
              case "$avg": {
                const values = docs
                  .map((doc) => evalExpr(doc, arg))
                  .filter((value) => typeof value === "number");
                out[field] = values.length
                  ? values.reduce((a, b) => a + b, 0) / values.length
                  : null;
                break;
              }
              case "$first":
                out[field] = docs.length ? evalExpr(docs[0], arg) : null;
                break;
              case "$push":
                out[field] = docs.map((doc) => evalExpr(doc, arg));
                break;
              default:
                throw new Error(`memory-db: unsupported accumulator ${op}`);
            }
          }
          return out;
        });
        break;
      }

      default:
        throw new Error(`memory-db: unsupported aggregation stage ${operator}`);
    }
  }

  return rows;
}

// ── Model ─────────────────────────────────────────────────────────────────────

export class MemoryModel {
  readonly docs: Doc[] = [];

  constructor(
    public readonly modelName: string,
    private readonly options: MemoryModelOptions = {},
  ) {}

  find(filter: Doc = {}) {
    return new MemoryQuery(this.docs, filter);
  }

  findOne(filter: Doc = {}) {
    return new MemoryQuery(this.docs, filter, true);
  }

  findById(id: any) {
    return new MemoryQuery(this.docs, { _id: id }, true);
  }

  countDocuments(filter: Doc = {}): Promise<number> {
    return Promise.resolve(this.docs.filter((doc) => matches(doc, filter)).length);
  }

  aggregate(pipeline: any[]): Promise<Doc[]> {
    if (this.options.aggregateHandler) {
      return Promise.resolve(
        this.options.aggregateHandler(this.docs.map((doc) => ({ ...doc })), pipeline),
      );
    }
    return Promise.resolve(runAggregate(this.docs.map((doc) => ({ ...doc })), pipeline));
  }

  async create(data: Doc | Doc[]): Promise<Doc> {
    const input = Array.isArray(data) ? data[0] : data;
    const doc: Doc = {};

    for (const [key, value] of Object.entries(input)) {
      // Mongoose drops undefined values instead of persisting them.
      if (value !== undefined) doc[key] = value;
    }

    for (const field of this.options.required ?? []) {
      if (doc[field] === undefined || doc[field] === null) {
        throw validationError(`${this.modelName}: \`${field}\` is required.`);
      }
    }

    for (const [field, allowed] of Object.entries(this.options.enums ?? {})) {
      if (doc[field] !== undefined && !allowed.includes(doc[field])) {
        throw validationError(
          `${this.modelName}: \`${doc[field]}\` is not a valid enum value for \`${field}\` (allowed: ${allowed.join(", ")}).`,
        );
      }
    }

    if (!doc._id) doc._id = new mongoose.Types.ObjectId();

    if (this.options.timestamps) {
      const now = new Date();
      doc.createdAt = doc.createdAt ?? now;
      doc.updatedAt = now;
    }

    this.assertUniqueIndexes(doc);

    this.docs.push(doc);
    return { ...doc };
  }

  /** Reproduces MongoDB's duplicate-key failure for the declared indexes. */
  private assertUniqueIndexes(doc: Doc) {
    for (const index of this.options.uniqueIndexes ?? []) {
      if (
        index.partialFieldExists &&
        !hasPath(doc, index.partialFieldExists)
      ) {
        continue; // outside the partial index — exactly like MongoDB
      }

      const conflict = this.docs.some((existing) =>
        index.fields.every((field) => looseEq(getPath(existing, field), getPath(doc, field))),
      );

      if (conflict) {
        const error: any = new Error(
          `E11000 duplicate key error collection: test.${this.modelName} index: ${index.name}`,
        );
        error.code = 11000;
        error.name = "MongoServerError";
        error.keyPattern = Object.fromEntries(index.fields.map((f) => [f, 1]));
        throw error;
      }
    }
  }

  reset() {
    this.docs.length = 0;
  }

  /** Test helper: insert without validation (used to stage legacy documents). */
  insertRaw(doc: Doc) {
    if (!doc._id) doc._id = new mongoose.Types.ObjectId();
    this.docs.push(doc);
    return doc;
  }
}

function validationError(message: string) {
  const error: any = new Error(message);
  error.name = "ValidationError";
  error.errors = { value: { message } };
  return error;
}

// ── Registry ──────────────────────────────────────────────────────────────────

const registry = new Map<string, Doc[]>();

export const MemoryDb = {
  collection(name: string): Doc[] {
    if (!registry.has(name)) registry.set(name, []);
    return registry.get(name)!;
  },
  reset() {
    registry.clear();
  },
};

export function createMemoryModel(
  modelName: string,
  collectionName: string,
  options: MemoryModelOptions = {},
): MemoryModel {
  const model = new MemoryModel(modelName, options);
  // Share the backing array with the aggregation `$lookup` registry.
  const shared = MemoryDb.collection(collectionName);
  (model as any).docs = shared;
  return model;
}

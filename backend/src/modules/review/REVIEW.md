# Review & Rating System — Architecture Notes

Backend-only extension of the existing Review module to support the seven
reviewer → reviewee relationships required by the product:

```
HR
 ├──→ Employee
 ├──→ Manager
 └──→ Student        (after a COMPLETED gig)

Employee
 └──→ Hotel

Manager
 └──→ Hotel

Student
 ├──→ Hotel          (after a COMPLETED gig)
 └──→ Manager        (after a COMPLETED gig)
```

---

## 1. What already existed (discovery findings)

| Concern | Existing implementation |
| --- | --- |
| Architecture | **Single generic collection** (`reviews`) — a hybrid of "Option A" and "Option D". No per-role review collections, no polymorphic reviewer/reviewee type pair. |
| Reviewer | `userId` (ObjectId → `User`) + `postedBy` (`UserRole`) |
| Reviewee | **Did not exist.** There was no field identifying who/what was being reviewed. |
| Context | `hotelId` (required), `gigId` (optional), `jobId` (optional), `reviewType` (`GIG` \| `JOB`, required) |
| Payload | `rating` + `review` (author's own words) and `feedbackRating` + `feedbackReview` (hotel-side feedback fields) |
| Eligibility | **None.** No role guard, no relationship check, no gig-completion check. |
| Duplicate protection | **None.** |
| Rating validation | **None** (`rating: { type: Number }` — no `min`/`max`). |
| Indexes | Only the unique secondary `id`. No `timestamps: true`, so `createdAt` did not exist even though the repository sorted by it. |
| Assignment model | `Booking` **is** the gig-assignment document (`workerId` ↔ `gigId`, `status`, `completedAt`). There is no separate `GigAssignment`, so none was created. |
| Completion | `Booking.status === "COMPLETED"` (`GigStatus` has no COMPLETED value — completion lives on the booking, not the gig). |
| Employment | `User.hotelId` (ObjectId → `Hotel`) + `User.role`. This is the authoritative organisation membership; `HotelRepository.countActiveEmployees/countActiveManagers` already treat it that way. |
| Gig ↔ Hotel | `Gig.hotelId`, mirrored on `Booking.gigHotelId`. |
| Gig ↔ Manager | `Gig.postedBy` (the user id that created the gig) + the manager's `User.hotelId`. |
| Auth | Global `authMiddleware` (JWT → `req.user = { id, roles, departmentType, departmentRole, hotelId }`) then `tenantMiddleware`. Review routes sit behind both. |
| Consumers | No in-repo frontend calls `/review/*`; the endpoints are consumed by an external mobile client, so **paths, field names and the `{success,message,data,meta}` envelope must not change**. |

### Security defect found in the existing controller

```ts
const dto = { userId, postedBy, ...req.body };   // body spread LAST
```

`req.body` overwrote the token-derived reviewer id and role, so any client could
claim to be any reviewer with any role. Fixed: identity now comes **only** from
the authenticated token (`ReviewActor`), and body-supplied `userId`/`postedBy`
are ignored.

---

## 2. Design decisions

### 2.1 Extend the existing single-document model (no new collections)

Adding `EmployeeReview` / `StudentReview` / `HotelReview` collections would
duplicate a concept that already exists and would strand the data already in
`reviews`. The smallest clean extension is to give the existing document an
explicit **reviewee** and an explicit **relationship discriminator**.

New optional fields on `Review`:

| Field | Purpose |
| --- | --- |
| `revieweeId` | Who/what is being reviewed (`refPath: "revieweeRef"`). |
| `revieweeRef` | `"User"` or `"Hotel"` — makes `revieweeId` populate correctly. |
| `revieweeRole` | Snapshot of the reviewee's `UserRole` when `revieweeRef === "User"` (mirrors how `postedBy` already snapshots the reviewer's role; enables filtering without a join). |
| `reviewRelationship` | The discriminator (`HR_TO_EMPLOYEE`, … `STUDENT_TO_MANAGER`). |
| `bookingId` | The `Booking` that justifies a gig-scoped review — the auditable answer to *"why are these two allowed to review each other?"*. |

`userId` keeps its meaning as **the reviewer**, now populated authoritatively
from the token. `postedBy` stays the reviewer's role.

Legacy documents are untouched: they simply have no `reviewRelationship` /
`revieweeId`. Read paths use `$or: [{ userId }, { revieweeId }]` so that both
legacy documents (where the student was stored in `userId` for hotel-side
feedback) and new documents resolve correctly.

### 2.2 `reviewType` = context, `reviewRelationship` = direction

`reviewType` already describes the *context* of a review (`GIG`, `JOB`). A new
value `EMPLOYMENT` covers HR→Employee, HR→Manager, Employee→Hotel and
Manager→Hotel, which have no gig or job. `reviewRelationship` is a separate
axis, so existing `reviewType` semantics and existing filters keep working.

### 2.3 Centralised, declarative eligibility (no scattered `if (role === "HR")`)

`review.eligibility.ts` holds a **rule table** — one declarative record per
relationship — plus the validators. Nothing outside this file decides whether a
review is allowed; the controller only adapts HTTP, the service only
orchestrates.

```
ReviewController  →  ReviewService  →  ReviewEligibilityService
                                        ├─ resolveRelationship()
                                        ├─ validateReviewEligibility()
                                        ├─ validateReviewerRole()
                                        ├─ validateEmploymentRelationship()   (HR→Employee/Manager, Employee/Manager→Hotel)
                                        ├─ validateCompletedGig()             (booking.status === COMPLETED)
                                        ├─ validateHotelRelationship()        (hotel derived from the gig/booking)
                                        ├─ validateManagerRelationship()      (manager attached to the gig's hotel)
                                        └─ validateDuplicateReview()
```

### 2.4 Server-derived context — client ids are hints, never proof

| Value | Source of truth |
| --- | --- |
| reviewer id / role | JWT (`req.user`) — body value ignored |
| `hotelId` for gig-scoped reviews | `Gig.hotelId` / `Booking.gigHotelId` looked up from the gig |
| `hotelId` for employment-scoped reviews | `User.hotelId` of the authenticated reviewer |
| `gigId` | resolved from the client's secondary id (`GIG_xxx`) via `GigModel.findOne({ id })`, stored as the gig's `_id` (existing convention preserved) |
| `revieweeId` for `*_TO_HOTEL` | the derived hotel, never the body |
| `bookingId` | the `Booking` found for (worker, gig) with `status: COMPLETED` |

If the client sends a `hotelId` that disagrees with the derived one, the request
is rejected rather than silently rewritten — a mismatch means the client is
targeting an entity it has no relationship with.

### 2.5 Duplicate protection — database level, race-proof

A `findOne()`-then-`create()` check cannot survive concurrent requests, so the
guarantee lives in a **partial unique index**:

```ts
ReviewSchema.index(
  { userId: 1, reviewRelationship: 1, revieweeId: 1, hotelId: 1, gigId: 1 },
  { unique: true, partialFilterExpression: { reviewRelationship: { $exists: true } } }
);
```

One review per `(reviewer, relationship, reviewee, hotel, gig)` — which is
exactly:

```
Student + Gig + Hotel     Student + Gig + Manager     HR + Gig + Student
HR + Employee             HR + Manager                Employee + Hotel     Manager + Hotel
```

`partialFilterExpression` is deliberate: legacy documents have no
`reviewRelationship`, so they are **excluded from the index**. This means the
index can be built on a production collection without failing on pre-existing
duplicates, and no historical review is invalidated. A friendly 409 is returned
from the pre-check, and `E11000` from a lost race is mapped to the same 409.

### 2.6 Review lifecycle — unchanged (create-only)

The existing product exposes create + read only: no update, no delete, no
moderation states. Per "do not introduce a new review lifecycle unless
required", none was added. Consequently there is no update path to re-authorise
and no soft-delete/status field to invent.

### 2.7 Aggregation — semantics preserved

`Hotel` has **no** stored rating field and nothing in the codebase folded review
ratings into a hotel score, so no stored aggregate was introduced and existing
rating semantics are unchanged. `get-hotels-with-reviews` keeps returning the
raw grouped reviews.

A single **read-only, computed** summary endpoint was added
(`GET /review/get-hotel-rating-summary`) because Requirement 2 (Employee/Manager
rate their hotel) has no consumer otherwise. It computes `averageRating`,
`totalReviews` and a 1–5 `distribution` on the fly, split by relationship, and
writes nothing back.

### 2.8 API surface

All six existing endpoints keep their exact paths, query contracts and response
shape. Two additions, both genuinely required to make the new relationships
usable:

```
POST /api/v1/review/create-review                  (extended — relationship aware)
GET  /api/v1/review/get-user-posted-gig-reviews    (unchanged)
GET  /api/v1/review/get-user-feedback-gig-reviews  (unchanged + $or revieweeId)
GET  /api/v1/review/get-gig-reviews-for-hotel      (unchanged)
GET  /api/v1/review/get-gig-review-posted-by-hotel (unchanged)
GET  /api/v1/review/get-hotels-with-reviews        (unchanged)
GET  /api/v1/review/get-user-received-reviews      (NEW — reviews about the caller)
GET  /api/v1/review/get-hotel-rating-summary       (NEW — computed hotel rating)
```

`get-user-received-reviews` is required because HR→Employee, HR→Manager and
HR→Student reviews would otherwise be write-only: the subject has no way to read
them.

### 2.9 Role interpretation (documented, not assumed silently)

| Relationship | Reviewer roles | Reviewee |
| --- | --- | --- |
| `HR_TO_EMPLOYEE` | `HR`, `ADMIN` | `User` with role `EMPLOYEE` in the reviewer's hotel |
| `HR_TO_MANAGER` | `HR`, `ADMIN` | `User` with role `MANAGER` in the reviewer's hotel |
| `HR_TO_STUDENT` | `HR`, `ADMIN` | `User` with role `STUDENT`/`PROFESSIONAL` with a COMPLETED booking on a gig of the reviewer's hotel |
| `EMPLOYEE_TO_HOTEL` | `EMPLOYEE` | the `Hotel` in the reviewer's own `User.hotelId` |
| `MANAGER_TO_HOTEL` | `MANAGER` | the `Hotel` in the reviewer's own `User.hotelId` |
| `STUDENT_TO_HOTEL` | `STUDENT`, `PROFESSIONAL` | the `Hotel` that owns the gig of a COMPLETED booking |
| `STUDENT_TO_MANAGER` | `STUDENT`, `PROFESSIONAL` | `User` with role `MANAGER`/`ADMIN` of the gig's hotel (or the user recorded in `Gig.postedBy`) |

`ADMIN` is accepted alongside `HR` because it is the hotel's top-level staff role
in this codebase (`adminOnly` already treats hotel `ADMIN` as a hotel authority);
an `ADMIN` is bound by exactly the same hotel-scope checks as `HR`.

"Manager associated with the gig": `Gig.postedBy` is not a reliable *manager*
pointer (gigs can be posted by an HR user or by the hotel account itself), so
association is established as **`User.role === MANAGER|ADMIN` AND
`User.hotelId === Gig.hotelId`**, with `Gig.postedBy` accepted as an additional
sufficient link. A manager of a *different* hotel is always rejected, which is
the actual attack the requirement describes.

### 2.10 Validation

* `rating` — integer 1–5, matching the existing convention in
  `BookingService.rateBooking` and `Booking.rating` / `Application.rating`
  (`min: 1, max: 5`). Strings that are not exact integers, `NaN`, booleans,
  arrays and out-of-range values are rejected with 400. A review must carry at
  least one of `rating` / `review`.
* `review`, `feedbackReview` — trimmed, control characters removed (newlines and
  tabs preserved), capped at 2000 characters, and HTML/script markup stripped so
  a web consumer cannot execute stored payloads. Plain prose, punctuation,
  emoji and multi-line text are preserved verbatim.
* `hotelId`, `gigId`, `revieweeId` — must be valid ObjectIds / resolvable
  secondary ids; a malformed id is a 400, never a leaked driver error.

### 2.11 Backward compatibility & migration

Every schema change is **additive and optional**, so no existing document is
invalidated:

* new fields are optional → legacy docs still validate and read;
* `timestamps: true` → new docs get `createdAt`/`updatedAt`; legacy docs simply
  have none (mongoose does not backfill, and reads never required them);
* `rating: { min: 1, max: 5 }` → validators run on write only, so a legacy
  out-of-range value neither breaks reads nor the index build;
* the unique index is **partial** → legacy docs are outside it;
* no field was renamed, removed or retyped in storage
  (`IReview.feedbackRating` was corrected from `string` to `number` in the
  TypeScript interface only — the schema always stored `Number`).

`src/scripts/migrate-reviews.ts` is therefore **report-only by default**: it
counts legacy vs. relationship-aware documents, verifies the new indexes exist
and prints a sample of un-inferable documents. With the explicit `--backfill`
flag it sets `reviewRelationship` / `revieweeId` **only** where the legacy
document is unambiguous, and never touches `rating`, `review`,
`feedbackRating`, `feedbackReview`, `userId`, `hotelId` or `gigId`. Nothing is
deleted.

---

## 3. API reference

Envelope for every response is the existing one:
`{ success, message, data, meta? }`. All routes require a valid JWT
(global `authMiddleware`).

### POST `/api/v1/review/create-review`

Body — **all fields optional**; identity is never read from the body:

```jsonc
{
  "reviewRelationship": "STUDENT_TO_HOTEL", // optional; inferred when omitted
  "revieweeId": "<ObjectId>",               // required for person reviewees
  "gigId": "GIG_xxxxxxxxxx",                // required for gig-scoped reviews (secondary id)
  "hotelId": "<ObjectId>",                  // optional hint; must match the derived hotel
  "jobId": "<ObjectId>",                    // optional pass-through
  "rating": 4,                              // integer 1–5
  "review": "…",                            // ≤ 2000 chars, markup stripped
  "feedbackRating": 5,                      // hotel-side feedback (existing convention)
  "feedbackReview": "…"
}
```

`201` returns the persisted review. Errors:

| HTTP | `code` | Cause |
| --- | --- | --- |
| 400 | `REVIEW_VALIDATION_FAILED` | bad rating/text, missing `gigId`/`revieweeId`, malformed id |
| 400 | `GIG_NOT_COMPLETED` | booking exists but is CONFIRMED / CANCELLED / NO_SHOW |
| 401 | `UNAUTHENTICATED` | no usable identity |
| 403 | `FORBIDDEN_REVIEWER_ROLE` | role cannot use this relationship |
| 403 | `INVALID_REVIEW_RELATIONSHIP` | reviewer and reviewee are not legitimately related, or a supplied id disagrees with the derived one |
| 403 | `NO_HOTEL_MEMBERSHIP` | reviewer has no `User.hotelId` |
| 403 | `REVIEWER_NOT_FOUND` / `REVIEWER_SUSPENDED` | token subject is not a review-capable user |
| 404 | `HOTEL_NOT_FOUND` / `GIG_NOT_FOUND` / `REVIEWEE_NOT_FOUND` / `BOOKING_NOT_FOUND` | referenced entity does not exist |
| 409 | `DUPLICATE_REVIEW` | one review already exists for this relationship + context |

### Reads

| Route | Scope | Notes |
| --- | --- | --- |
| `GET /get-user-posted-gig-reviews` | caller as reviewer | unchanged |
| `GET /get-user-feedback-gig-reviews` | caller as reviewer **or** reviewee | superset of the old behaviour, so new hotel-side feedback stays discoverable by the worker |
| `GET /get-gig-reviews-for-hotel` | caller's hotel | now 403 when no hotel scope resolves (see §4) |
| `GET /get-gig-review-posted-by-hotel` | caller's hotel | same |
| `GET /get-hotels-with-reviews` | global browse | unchanged, `?search=` honoured |
| `GET /get-user-received-reviews` | caller as reviewee | **new**; `?reviewRelationship=`, `?hotelId=` |
| `GET /get-hotel-rating-summary` | any existing hotel | **new**; `?hotelId=`, defaults to the caller's hotel |

---

## 4. Security defects found and fixed

| # | Defect | Fix |
| --- | --- | --- |
| 1 | `createReview` spread `req.body` **after** the token-derived identity, so any client could set `userId` / `postedBy` and impersonate any reviewer with any role. | Identity is built only from the JWT (`toActor`), and the body is copied through an explicit allowlist (`toCreateInput`). |
| 2 | No relationship validation at all: any authenticated user could review any hotel/gig. | The eligibility engine resolves and verifies every relationship from authoritative records. |
| 3 | No completion check: a review could be written for a gig that was merely booked. | `Booking.status === COMPLETED` is required for every gig-scoped relationship. |
| 4 | **Cross-tenant read leak**: `hotelId` is an optional filter and Mongoose 9 *strips* `undefined` when casting, so `get-gig-reviews-for-hotel` / `get-gig-review-posted-by-hotel` called by a user with no `hotelId` (any student) returned gig reviews for **every** hotel. | `assertHotelScope()` returns 403 `NO_HOTEL_SCOPE`. `tests/review/review.query-semantics.test.ts` pins the real Mongoose behaviour so the guard cannot be removed by accident. |
| 5 | No duplicate protection, so the same review could be written repeatedly (and concurrently). | Partial unique index + pre-check + `E11000 → 409`. |
| 6 | `rating` had no bounds — any number, string or object was accepted. | Integer 1–5 validated in `review.validation.ts` and enforced by the schema. |
| 7 | Review text was stored verbatim — a stored-XSS vector for any HTML consumer. | Control characters removed, markup/handlers/`javascript:` neutralised, length capped. |
| 8 | Errors were returned as `res.status(error.httpStatus)` with no fallback, so a Mongoose failure produced `res.status(undefined)` and a crash instead of a response. | `respondWithError()` maps known 4xx verbatim and everything else to a generic 500 with no internal detail. |
| 9 | Malformed identifiers reached the driver as CastErrors. | Every client id is validated before it enters a query. |

---

## 5. Behaviour changes a client may notice

All are required by the specification or are strict security fixes; none removes
an endpoint or a field.

1. **Gig reviews now require a COMPLETED booking.** A worker could previously
   post a gig review immediately after booking. This is exactly what §11/§12
   require to be blocked.
2. **Reviewer identity is authoritative.** A body-supplied `userId` / `postedBy`
   is ignored. Hotel-side feedback is now stored as
   `userId = <HR user>`, `revieweeId = <student>`, and remains readable by the
   student through `get-user-feedback-gig-reviews` and
   `get-user-received-reviews`.
3. **`reviewType` and `hotelId` are derived, not accepted.** For gig reviews the
   hotel comes from the gig; for employment reviews from the reviewer's
   membership. A disagreeing client value is rejected with 403 rather than
   silently rewritten.
4. **Unknown hotel/gig is now 404 instead of 400**, matching the required error
   contract.
5. **Unscoped hotel reads are 403** instead of returning every hotel's reviews.
6. **HR feedback without `revieweeId`** is resolved from the gig's completed
   bookings; when more than one worker completed the gig the request must name
   the student (400). This keeps the old single-worker payload working.

---

## 6. Observations / deliberate non-changes

* **`GET /get-hotels-with-reviews` is a global browse endpoint** — it returns
  reviews for all hotels to any authenticated user. That is pre-existing
  behaviour and appears intentional (hotel discovery). It was left untouched to
  avoid breaking an existing consumer, but if the product wants hotel feedback to
  be private it should be scoped; flagged rather than silently changed.
* **`jobId` remains a non-authoritative pass-through.** It was already stored
  without validation; it is now type-validated as an ObjectId but is not checked
  against the hotel, because no relationship in this feature set uses JOB context
  and no endpoint filters by it.
* **The repository still ignores `filters.postedBy`.** `findByUser` /
  `findByHotel` were left byte-identical: making them honour `postedBy` would
  narrow existing result sets and break consumers. New query paths use dedicated
  methods instead.
* **`createdAt` sorting only becomes meaningful for new documents**, since
  `timestamps: true` was absent before. Legacy documents have no `createdAt` and
  are unaffected.
* **Generated API docs were already stale** — `api-routes.json`,
  `API_INVENTORY.md` and `API_DOCS.html` never contained the review module.
  Regenerating them is a repo-wide artifact refresh (`npm run report:api`,
  `npm run docs:api`) and was left out of this change to keep the diff focused.

---

## 7. Testing

```
npm test                 # 221 tests, 7 suites
npm run typecheck        # production sources
npx tsc -p tsconfig.test.json --noEmit   # test sources
npm run migrate:reviews  # report-only verification against a real database
```

| Suite | Focus |
| --- | --- |
| `review.eligibility.test.ts` | The full relationship matrix: all 7 valid combinations, every invalid combination, completion gating, spoofed ids, duplicates, inference, payload rules (64 tests) |
| `review.api.test.ts` | Real Express app over HTTP: auth, all 7 relationships, malicious payloads, concurrency, regression of every pre-existing endpoint, new endpoints (61 tests) |
| `review.validation.test.ts` | Rating and text rules, XSS sanitisation, id validation |
| `review.model.test.ts` | Schema shape, the partial unique index, and validation of legacy documents |
| `review.service.test.ts` | Error mapping incl. the E11000 race, summary aggregation mapping, hotel-scope guard |
| `review.repository.test.ts` | Exact query filters, including `gigId: null` duplicate semantics |
| `review.query-semantics.test.ts` | Pins the real Mongoose `undefined`-stripping behaviour the leak depended on |

Tests live in `backend/tests/`, outside `src/`, so `npm run build` and the Docker
image are unaffected. No MongoDB server is reachable from this environment (and
`mongodb-memory-server` cannot download a binary), so the API tests substitute an
in-memory double for the five Mongoose models the review module touches; that
double reproduces the production unique/partial index, enum and required
validation, `undefined`-stripping and the aggregation stages used, and throws on
anything unimplemented rather than returning a plausible wrong answer.

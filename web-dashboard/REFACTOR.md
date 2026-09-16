# Mend Admin Console — UI/UX Refactor Plan & Audit

> Refactor of `web-dashboard/` (Mend **Platform Admin** UI). Entry point remains
> `index.html → src/main.jsx → src/App.jsx`. The orphaned TSX LMS shell
> (`src/main.tsx`, `src/App.tsx`, `src/pages/*.tsx`, `src/components/ui/*.tsx`, …) is
> **not** wired into the build (no `@/` alias exists, so it could not even resolve) and
> was intentionally left untouched as legacy/unused code — see "Cleanup decisions".

## 1. UX audit — problems found in the previous UI

### Navigation / Information architecture
1. Sidebar grouped pages by backend module ("Tenants", "Platform", "Learning") with
   jargon labels; "Access Control" (an org concern) lived under "Tenants".
2. LMS was exposed as five flat CRUD screens (courses / categories / enrollments in
   nav; content + assessments reachable only via in-page links).
3. `Overview` (Home.jsx) rendered a wall of 10 identical KPI cards plus 8 "quick link"
   cards that duplicated the sidebar — no hierarchy, no meaning.
4. `Analytics` duplicated Overview almost exactly (same endpoint, same 10 metrics).
5. No top bar / breadcrumbs on desktop; only a mobile hamburger header existed.
   Users could not tell *where they were* on deep pages (course content, assessments).
6. Hotel detail and user detail lived in state-only drawers (no URL) — no back-button,
   no deep links, no sharing.
7. `Compliance` and `RBAC` sat as floating top-level entries with no relationship to
   the entities they operate on (hotels).

### Information
8. Hotel drawer dumped 15 raw fields (lat/lng, pincode, payment id) with no grouping.
9. Metrics had no context ("Attendance Today" is hotel-operations data, not a
   platform-admin concern) and no links to the place where you could act on them.
10. Raw backend jargon surfaced to admins ("PUT /user/admin/users/:id (MENDADMIN)",
    "MANAGE_RBAC permission is required", endpoint names in subtitles, auth caveats).
11. Compliance "breakdown" rendered as raw `JSON.stringify` in a `<pre>`.
12. Hotels list could not show "Created" at all (backend select excludes timestamps) —
    a column that would always read "-".

### Interaction
13. Every hotel row had 4 equally-styled buttons (View / Edit / Credentials / Delete);
    destructive "Delete" adjacent to routine actions, no extra friction.
14. LMS content & assessments pages deleted rows with `window.confirm()` while other
    pages used a styled `ConfirmModal` — inconsistent destructive UX.
15. Create/edit for entities with 10–18 fields was crammed into a 370–400px side rail
    (courses, categories) or a giant modal (hotel) — modal overload for complex forms.
16. Filters/pagination/search were never in the URL (state lost on reload/refresh).
17. Enrollments "Approve" button could **never appear**: UI checked
    `status === "PENDING"`, but the backend enum is `applied` (see §4 fixes).
18. `getCourseEnrollments()` in `api/lms.js` mapped the response shape wrong
    (`items`/`data` instead of `enrollments`) → enrollments list always rendered empty.

### Visual
19. `index.css` still set `body { background:#0D1630 }` (leftover dark theme) behind a
    light app — dark overscroll bands; `Inter` referenced but never loaded.
20. Two accent systems (hardcoded `#1A2F5E` + ad-hoc `blue-*` hover states) and three
    different sort indicators ("+-", "ASC/DESC", "↑↓") and two pagination styles.
21. Every page re-implemented `Toast`, `PageBtn`, `SortIcon`, `avatarClass`,
    `formatDate`, badge tones — with slightly different semantics per page
    (e.g. "Paid" blue here, emerald there).
22. `tailwind.config.js` (v3-style) was dead config — Tailwind v4 runs from CSS.

### Technical
23. 1,326-line `Hotels.jsx` and 725-line `Users.jsx` mixed list + drawer + forms +
    all mutations in one component (Hotels used 35 `useState` hooks).
24. No shared primitives (table, tabs, drawer, modal, form field, states); loading was
    an ad-hoc spinner overlay or a "Loading…" string; some errors shown raw.
25. MUI + emotion packages installed but imported nowhere (dead weight).

## 2. New information architecture

Sidebar answers "what type of thing am I managing?":

```text
Mend Admin — Platform console
│
├── Overview                      /dashboard                    platform pulse + what needs attention
│
├── Organizations
│   └── Hotels                    /dashboard/hotels
│       ├── Hotel detail          /dashboard/hotels/:hotelId   (tabs: Overview · People & access ·
│       │                              ?tab=overview|people|billing|operations
│       │                              Subscription & onboarding · Operations)
│       ├── Create hotel          /dashboard/hotels/new
│       └── Edit hotel            /dashboard/hotels/:hotelId/edit
│
├── People
│   └── Users                     /dashboard/users              (row → detail drawer ?user=)
│
├── Learning
│   ├── Courses                   /dashboard/learning/courses
│   │   ├── Course detail         /dashboard/learning/courses/:courseId
│   │   │                              (tabs: Content · Assessments · Settings)
│   │   └── New course            /dashboard/learning/courses/new
│   ├── Categories                /dashboard/learning/categories
│   └── Enrollments               /dashboard/learning/enrollments   (?course=)
│
├── Insights
│   ├── Analytics                 /dashboard/analytics          all metrics + per-hotel drill-down + CSV
│   └── Compliance                /dashboard/compliance         certification reports per hotel
│
└── Platform
    └── Access control (RBAC)     /dashboard/rbac               (?hotel= scoped rules, upsert/disable/clone)
```

Old LMS routes (`/dashboard/lms/*`) are kept as redirects.

**Removed vs. the conceptual brief:** "Payments / Onboarding" and "Settings" top-level
sections were NOT added — no platform-admin payment/settings endpoints exist in the
backend. Onboarding (initial payment, credentials, subscription) is a *property of a
hotel* and lives on the hotel detail page instead.

## 3. Design system (light, enterprise, calm)

- Tailwind v4 CSS-first `@theme` tokens: `brand` (navy ramp), slate neutrals, semantic
  success/warning/danger/info. No dark body background, system font stack.
- One `Icons.jsx` stroke-icon set (consistent 1.8 stroke).
- UI kit in `src/components/ui/`: Button (primary/secondary/ghost/danger + loading),
  Card, StatusBadge (semantic tones + text, never color-only), Field/Input/Select/
  Textarea (labels, helper, errors, a11y wiring), Modal, Drawer, Dropdown menu,
  Tabs (roving keyboard nav), DataTable (head/rows/sort/loading skeletons/empty/error),
  Pagination, Toolbar (search + compact filters + chips + clear), Skeleton, EmptyState,
  ErrorState, ConfirmDialog (danger + optional typed confirmation), Toast (context +
  `useToast`).
- Layout: `AppShell` = sidebar (grouped nav, active state, collapse persisted, mobile
  overlay) + topbar (breadcrumbs · account chip · logout). Same shell on every page.
- Action hierarchy: exactly one primary action per page; secondary = outline; ghost =
  icon; destructive lives in "⋯" menus or danger zones and always goes through a
  confirmation dialog that states the consequence (typed confirmation for deleting
  hotels/users).

## 4. Migration safety / behavior parity

- All API calls stay in `src/api/*` (unchanged clients, endpoints, methods, payloads).
  No backend changes.
- **Two frontend integration fixes (documented, no contract change):**
  1. `api/lms.js → getCourseEnrollments` now also unwraps `{ enrollments, total }`.
  2. Enrollments UI approves when status is `applied` (backend enum) — previously
     matched a non-existent `PENDING`, so Approve was unreachable.
- Every existing capability preserved: hotel CRUD, status toggle, subscription update,
  per-hotel analytics, hotel-user create / bulk upload / promote, send credentials
  (hotel + user), user list/profile/update/suspend/delete, RBAC options/upsert/delete/
  enable/disable/clone, LMS categories/courses/modules/lectures/assessments/questions/
  publish/archive/delete, enrollments approve, analytics summary + per-hotel dashboard
  + CSV export, compliance reports + per-hotel report.
- `+` new affordances only where an existing API supports them: module/lecture reorder
  (`PATCH .../reorder`), server-side course filters (search/category/status — already
  accepted by `GET /lms/courses`).

## 5. Verification (results)

- `npm run build` — passes. Bundle: `dist/assets/index-*.js` 462.75 kB (gzip 138.06 kB), CSS 54.98 kB.
- `npm run lint` — 0 errors / 0 warnings (eslint flat config, `**/*.{js,jsx}`).
- Visual + interaction QA against a throwaway mock API (outside the repo) driving the real
  dev server with headless Chromium: all 13 screens/screenshots reviewed; scripted checks for
  login redirect, URL-synced search (debounced) + empty state + clear-filters, typed-confirm
  delete (button disabled until name typed, cancel safe), tab ↔ `?tab=` sync, hotel-user create
  modal → toast → list refresh, category create, course module add, enrollment approve,
  RBAC rule filter, unknown-hotel error state, sidebar collapse persistence, legacy
  `/dashboard/lms/*` redirect — all pass with zero page errors. The only console noise was two
  intentionally failing requests (404 hotel / 404 module-assessment) proving error states work.
- Fixed during QA: `useAsyncData` now refreshes whenever the (memoized) loader identity changes,
  so URL filter/pagination state actually re-queries; previously pages without explicit `deps`
  only fetched once on mount.
- Standardized status wording: hotel onboarding badge uses the shared `paymentLabel`
  ("Onboarding complete" / "Payment due") in both the list and the detail header.

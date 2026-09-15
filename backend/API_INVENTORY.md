# API Inventory Report

Generated: 2026-06-09T16:22:36.263Z
Project: `C:\Users\dell\Documents\Projects\Mend\mend-node-server`

## Summary

| Metric | Count |
| --- | ---: |
| Routes | 125 |
| Authenticated routes | 116 |
| Routes with RBAC | 20 |
| Routes with inferred body fields | 36 |
| Routes with schema middleware | 0 |

## Routes

| Method | Path | Controller | Auth | RBAC | Body | Query |
| --- | --- | --- | --- | --- | --- | --- |
| POST | `/api/v1/admin/hotels/:hotelId/block-gigs` | - | Yes | - | - | - |
| POST | `/api/v1/admin/login` | `AdminController.login` | No | - | `email` HIGH<br>`password` HIGH | - |
| POST | `/api/v1/admin/Send-Credentials` | `AdminController.sendCredentials` | Yes | roles: `MENDADMIN` | - | `hotelId` HIGH<br>`userId` HIGH |
| POST | `/api/v1/attendance/clock-in` | `AttendanceController.clockIn` | Yes | - | `coords` MEDIUM<br>`deviceId` MEDIUM<br>`hotelId` HIGH<br>`offlineQueuedAt` MEDIUM | - |
| POST | `/api/v1/attendance/clock-out` | `AttendanceController.clockOut` | Yes | - | `coords` MEDIUM<br>`deviceId` MEDIUM<br>`hotelId` HIGH<br>`offlineQueuedAt` MEDIUM | - |
| POST | `/api/v1/auth/login` | `AuthController.login` | No | - | `email` HIGH<br>`password` HIGH | - |
| POST | `/api/v1/auth/logout` | `AuthController.logout` | Yes | - | `sessionId` HIGH | - |
| POST | `/api/v1/auth/refresh` | `AuthController.refresh` | No | - | `refreshToken` HIGH | - |
| POST | `/api/v1/auth/register` | `AuthController.register` | No | - | `city` HIGH<br>`country` HIGH<br>`email` HIGH<br>`firstName` HIGH<br>+2 more | - |
| GET | `/api/v1/bookings/:id` | `BookingController.getBookingById` | Yes | - | - | - |
| PATCH | `/api/v1/bookings/:id/cancel` | `BookingController.cancelBooking` | Yes | - | - | - |
| PATCH | `/api/v1/bookings/:id/complete` | `BookingController.completeBooking` | Yes | - | - | - |
| PATCH | `/api/v1/bookings/:id/no-show` | `BookingController.noShowBooking` | Yes | - | - | - |
| PATCH | `/api/v1/bookings/:id/rate` | `BookingController.rateBooking` | Yes | - | - | - |
| GET | `/api/v1/bookings/mine` | `BookingController.getMyBookings` | Yes | - | - | `limit` HIGH<br>`page` HIGH<br>`status` HIGH |
| GET | `/api/v1/gigs` | `GigController.getPublicListings` | Yes | - | - | `certificationRequired` HIGH<br>`department` HIGH<br>`limit` HIGH<br>`page` HIGH<br>+2 more |
| POST | `/api/v1/gigs` | `GigController.createGig` | Yes | - | `certificationRequired` MEDIUM<br>`department` MEDIUM<br>`description` MEDIUM<br>`endAt` MEDIUM<br>+8 more | - |
| GET | `/api/v1/gigs/:id` | `GigController.getGigById` | Yes | - | - | - |
| PUT | `/api/v1/gigs/:id` | `GigController.updateGig` | Yes | - | `certificationRequired` MEDIUM<br>`department` MEDIUM<br>`description` MEDIUM<br>`endAt` MEDIUM<br>+6 more | - |
| POST | `/api/v1/gigs/:id/book` | `BookingController.bookGig` | Yes | - | - | - |
| GET | `/api/v1/gigs/:id/bookings` | `BookingController.getBookingsForGig` | Yes | - | - | `limit` HIGH<br>`page` HIGH |
| PATCH | `/api/v1/gigs/:id/cancel` | `GigController.cancelGig` | Yes | - | - | - |
| PATCH | `/api/v1/gigs/:id/close` | `GigController.closeGig` | Yes | - | - | - |
| PATCH | `/api/v1/gigs/:id/publish` | `GigController.publishGig` | Yes | - | - | - |
| GET | `/api/v1/gigs/mine` | `GigController.getHotelGigs` | Yes | - | - | `certificationRequired` HIGH<br>`department` HIGH<br>`limit` HIGH<br>`page` HIGH<br>+3 more |
| GET | `/api/v1/gigs/stats` | `GigController.getGigStats` | Yes | - | - | - |
| GET | `/api/v1/health` | - | Yes | - | - | - |
| GET | `/api/v1/hotel/admin/Hotels` | `HotelController.getHotels` | Yes | roles: `MENDADMIN` | - | `initialPaymentDone` HIGH<br>`limit` HIGH<br>`page` HIGH<br>`primaryPainPoint` HIGH<br>+3 more |
| POST | `/api/v1/hotel/login` | `HotelController.login` | No | - | `email` HIGH<br>`password` HIGH | - |
| POST | `/api/v1/lms/assessment/attempts/:attemptId/submit` | `AssessmentController.submitAttempt` | Yes | - | `answers` HIGH | - |
| GET | `/api/v1/lms/courses` | `CourseController.getCourses` | Yes | - | - | `category` HIGH<br>`hotelId` HIGH<br>`limit` HIGH<br>`page` HIGH<br>+4 more |
| POST | `/api/v1/lms/courses` | `CourseController.createCourse` | Yes | - | `category` HIGH<br>`createdBy` HIGH<br>`description` HIGH<br>`hotelId` HIGH<br>+2 more | - |
| DELETE | `/api/v1/lms/courses/:courseId/assessment` | `AssessmentController.deleteAssessment` | Yes | - | - | `hotelId` HIGH |
| GET | `/api/v1/lms/courses/:courseId/assessment` | `AssessmentController.getAssessment` | Yes | - | - | `hotelId` HIGH |
| POST | `/api/v1/lms/courses/:courseId/assessment` | `AssessmentController.createAssessment` | Yes | - | `description` MEDIUM<br>`hotelId` HIGH<br>`maxAttempts` MEDIUM<br>`passingScore` MEDIUM<br>+3 more | - |
| PUT | `/api/v1/lms/courses/:courseId/assessment` | `AssessmentController.updateAssessment` | Yes | - | `*` LOW<br>`description` MEDIUM<br>`hotelId` HIGH<br>`maxAttempts` MEDIUM<br>+4 more | - |
| GET | `/api/v1/lms/courses/:courseId/assessment/answers` | `AssessmentController.getAssessmentWithAnswers` | Yes | - | - | `hotelId` HIGH |
| POST | `/api/v1/lms/courses/:courseId/assessment/attempt` | `AssessmentController.startAttempt` | Yes | - | - | - |
| GET | `/api/v1/lms/courses/:courseId/assessment/attempts` | `AssessmentController.getMyAttempts` | Yes | - | - | - |
| GET | `/api/v1/lms/courses/:courseId/certificate` | `AssessmentController.getMyCertificate` | Yes | - | - | - |
| DELETE | `/api/v1/lms/courses/:courseId/enroll` | `EnrollmentController.drop` | Yes | - | - | - |
| POST | `/api/v1/lms/courses/:courseId/enroll` | `EnrollmentController.enroll` | Yes | - | - | - |
| GET | `/api/v1/lms/courses/:courseId/enrollment` | `EnrollmentController.getEnrollment` | Yes | - | - | - |
| GET | `/api/v1/lms/courses/:courseId/lectures` | `LectureController.getLectures` | Yes | - | - | `hotelId` HIGH |
| POST | `/api/v1/lms/courses/:courseId/lectures` | `LectureController.createLecture` | Yes | - | `description` HIGH<br>`duration` HIGH<br>`hotelId` HIGH<br>`notes` HIGH<br>+2 more | - |
| DELETE | `/api/v1/lms/courses/:courseId/lectures/:id` | `LectureController.deleteLecture` | Yes | - | - | `hotelId` HIGH |
| GET | `/api/v1/lms/courses/:courseId/lectures/:id` | `LectureController.getLectureById` | Yes | - | - | `hotelId` HIGH |
| PUT | `/api/v1/lms/courses/:courseId/lectures/:id` | `LectureController.updateLecture` | Yes | - | `description` HIGH<br>`duration` HIGH<br>`hotelId` HIGH<br>`notes` HIGH<br>+2 more | - |
| POST | `/api/v1/lms/courses/:courseId/lectures/:lectureId/complete` | `EnrollmentController.markLectureComplete` | Yes | - | - | - |
| PATCH | `/api/v1/lms/courses/:courseId/lectures/reorder` | `LectureController.reorderLectures` | Yes | - | `hotelId` HIGH<br>`orderedIds` HIGH | - |
| DELETE | `/api/v1/lms/courses/:id` | `CourseController.deleteCourse` | Yes | - | - | `hotelId` HIGH |
| GET | `/api/v1/lms/courses/:id` | `CourseController.getCourseById` | Yes | - | - | `hotelId` HIGH |
| PUT | `/api/v1/lms/courses/:id` | `CourseController.updateCourse` | Yes | - | `category` HIGH<br>`description` HIGH<br>`hotelId` HIGH<br>`thumbnailUrl` HIGH<br>+1 more | - |
| GET | `/api/v1/lms/courses/:id/full` | `CourseController.getCourseWithLectures` | Yes | - | - | `hotelId` HIGH |
| PATCH | `/api/v1/lms/courses/:id/status` | `CourseController.updateCourseStatus` | Yes | - | `hotelId` HIGH<br>`status` HIGH | - |
| GET | `/api/v1/lms/my/certificates` | `AssessmentController.getMyCertificates` | Yes | - | - | - |
| GET | `/api/v1/lms/my/dashboard` | `EnrollmentController.getLearningDashboard` | Yes | - | - | - |
| GET | `/api/v1/lms/my/enrollments` | `EnrollmentController.getMyEnrollments` | Yes | - | - | `status` HIGH |
| POST | `/api/v1/payment/create-payment` | `PaymentController.create` | No | - | `amount` HIGH<br>`orderId` HIGH | - |
| GET | `/api/v1/payment/delete-payment-entry` | `PaymentController.deletePaymentEntry` | No | - | - | `id` HIGH<br>`orderId` HIGH<br>`type` HIGH |
| POST | `/api/v1/payment/initiate-payment` | `PaymentController.initiate` | No | - | `hotel` HIGH<br>`orderId` HIGH<br>`user` HIGH | - |
| GET | `/api/v1/payment/payment-status/:orderId` | `PaymentController.getStatus` | No | - | - | `id` HIGH<br>`type` HIGH |
| GET | `/api/v1/rbac/available-options` | - | Yes | - | - | - |
| GET | `/api/v1/rbac/hotel/:hotelId` | - | Yes | permissions: `MANAGE_RBAC` | - | - |
| GET | `/api/v1/rbac/hotel/:hotelId/check` | - | Yes | - | - | - |
| POST | `/api/v1/rbac/hotel/:hotelId/clone-permissions` | - | Yes | permissions: `MANAGE_RBAC` | - | - |
| POST | `/api/v1/rbac/hotel/:hotelId/permission` | - | Yes | permissions: `MANAGE_RBAC` | - | - |
| GET | `/api/v1/rbac/hotel/:hotelId/role` | - | Yes | - | - | - |
| GET | `/api/v1/rbac/hotel/:hotelId/user-permissions` | - | Yes | - | - | - |
| DELETE | `/api/v1/rbac/permission/:id` | - | Yes | permissions: `MANAGE_RBAC` | - | - |
| PATCH | `/api/v1/rbac/permission/:id/disable` | - | Yes | permissions: `MANAGE_RBAC` | - | - |
| PATCH | `/api/v1/rbac/permission/:id/enable` | - | Yes | permissions: `MANAGE_RBAC` | - | - |
| POST | `/api/v1/recruitment/admin/hotels/:hotelId/block` | `RecruitmentController.blockHotelJobs` | Yes | - | `reason` HIGH | - |
| GET | `/api/v1/recruitment/applications` | `RecruitmentController.getHotelApplications` | Yes | - | - | `jobId` HIGH<br>`limit` HIGH<br>`page` HIGH<br>`sortBy` HIGH<br>+2 more |
| GET | `/api/v1/recruitment/applications/:id` | `RecruitmentController.getApplicationById` | Yes | - | - | - |
| PATCH | `/api/v1/recruitment/applications/:id/rate` | `RecruitmentController.rateApplication` | Yes | - | `rating` HIGH | - |
| PATCH | `/api/v1/recruitment/applications/:id/review` | `RecruitmentController.reviewApplication` | Yes | - | `recruiterNotes` HIGH<br>`status` HIGH | - |
| PATCH | `/api/v1/recruitment/applications/:id/withdraw` | `RecruitmentController.withdrawApplication` | Yes | - | - | - |
| GET | `/api/v1/recruitment/applications/mine` | `RecruitmentController.getMyApplications` | Yes | - | - | `limit` HIGH<br>`page` HIGH<br>`sortBy` HIGH<br>`sortOrder` HIGH<br>+1 more |
| GET | `/api/v1/recruitment/jobs` | `RecruitmentController.getPublicListings` | Yes | - | - | `certificationRequired` HIGH<br>`department` HIGH<br>`employmentType` HIGH<br>`limit` HIGH<br>+4 more |
| POST | `/api/v1/recruitment/jobs` | `RecruitmentController.createJob` | Yes | - | `certificationRequired` MEDIUM<br>`department` MEDIUM<br>`description` MEDIUM<br>`employmentType` MEDIUM<br>+10 more | - |
| DELETE | `/api/v1/recruitment/jobs/:id` | `RecruitmentController.deleteJob` | Yes | - | - | - |
| GET | `/api/v1/recruitment/jobs/:id` | `RecruitmentController.getJobById` | Yes | - | - | - |
| PUT | `/api/v1/recruitment/jobs/:id` | `RecruitmentController.updateJob` | Yes | - | `certificationRequired` MEDIUM<br>`department` MEDIUM<br>`description` MEDIUM<br>`employmentType` MEDIUM<br>+10 more | - |
| GET | `/api/v1/recruitment/jobs/:id/applications` | `RecruitmentController.getApplicationsForJob` | Yes | - | - | `limit` HIGH<br>`page` HIGH<br>`sortBy` HIGH<br>`sortOrder` HIGH<br>+1 more |
| GET | `/api/v1/recruitment/jobs/:id/applications/stats` | `RecruitmentController.getApplicationStats` | Yes | - | - | - |
| POST | `/api/v1/recruitment/jobs/:id/apply` | `RecruitmentController.applyToJob` | Yes | - | `coverNote` MEDIUM | - |
| PATCH | `/api/v1/recruitment/jobs/:id/close` | `RecruitmentController.closeJob` | Yes | - | - | - |
| PATCH | `/api/v1/recruitment/jobs/:id/publish` | `RecruitmentController.publishJob` | Yes | - | - | - |
| GET | `/api/v1/recruitment/jobs/mine` | `RecruitmentController.getHotelJobs` | Yes | - | - | `department` HIGH<br>`limit` HIGH<br>`page` HIGH<br>`search` HIGH<br>+3 more |
| GET | `/api/v1/recruitment/jobs/stats` | `RecruitmentController.getJobStats` | Yes | - | - | - |
| POST | `/api/v1/roster/createRoster` | `RosterController.createOrUpdateRosters` | Yes | roles: `ADMIN`, `MANAGER`, `MENDADMIN` | `employees` MEDIUM<br>`fromDate` MEDIUM<br>`shiftId` MEDIUM<br>`toDate` MEDIUM | - |
| DELETE | `/api/v1/roster/deleteRoster/:id` | `RosterController.deleteRoster` | Yes | roles: `ADMIN`, `MANAGER`, `MENDADMIN` | - | - |
| GET | `/api/v1/roster/getAllRosters` | `RosterController.getAllRosters` | Yes | - | - | - |
| GET | `/api/v1/roster/getRosterById/:id` | `RosterController.getRosterById` | Yes | - | - | - |
| GET | `/api/v1/roster/getShiftRosters/:shiftId` | `RosterController.getShiftRosters` | Yes | - | - | - |
| PUT | `/api/v1/roster/updateRoster/:id` | `RosterController.updateRoster` | Yes | roles: `ADMIN`, `MANAGER`, `MENDADMIN` | - | - |
| POST | `/api/v1/shift/createShift` | `ShiftController.createShift` | Yes | roles: `ADMIN`, `MANAGER`, `MENDADMIN` | `employees` MEDIUM<br>`endTime` MEDIUM<br>`startTime` MEDIUM | - |
| DELETE | `/api/v1/shift/deleteShift/:id` | `ShiftController.deleteShift` | Yes | roles: `ADMIN`, `MANAGER`, `MENDADMIN` | - | - |
| GET | `/api/v1/shift/getAllShifts` | `ShiftController.getAllShifts` | Yes | - | - | - |
| GET | `/api/v1/shift/getShiftById/:id` | `ShiftController.getShiftById` | Yes | - | - | - |
| GET | `/api/v1/shift/getUserShifts/:userId` | `ShiftController.getUserShifts` | Yes | - | - | - |
| PUT | `/api/v1/shift/updateShift/:id` | `ShiftController.updateShift` | Yes | roles: `ADMIN`, `MANAGER`, `MENDADMIN` | - | - |
| GET | `/api/v1/sos` | `SOSController.getSOSAlerts` | Yes | - | - | `hotelId` HIGH<br>`limit` HIGH<br>`offset` HIGH<br>`status` HIGH |
| GET | `/api/v1/sos/:id` | `SOSController.getSOSById` | Yes | - | - | - |
| PUT | `/api/v1/sos/:id/escalate` | `SOSController.escalateSOS` | Yes | - | `level` HIGH | - |
| PUT | `/api/v1/sos/:id/resolve` | `SOSController.resolveSOS` | Yes | - | - | - |
| POST | `/api/v1/sos/trigger` | `SOSController.triggerSOS` | Yes | - | `coords` MEDIUM<br>`message` MEDIUM | - |
| GET | `/api/v1/tasks` | `TaskController.listTasks` | Yes | - | - | `assignedBy` HIGH<br>`assignedTo` HIGH<br>`fromDate` HIGH<br>`limit` HIGH<br>+8 more |
| POST | `/api/v1/tasks` | `TaskController.createTask` | Yes | - | `assignedTo` MEDIUM<br>`description` MEDIUM<br>`priority` MEDIUM<br>`title` MEDIUM<br>+2 more | - |
| DELETE | `/api/v1/tasks/:id` | `TaskController.deleteTask` | Yes | - | - | - |
| GET | `/api/v1/tasks/:id` | `TaskController.getTaskById` | Yes | - | - | - |
| PUT | `/api/v1/tasks/:id` | `TaskController.updateTask` | Yes | - | `assignedTo` MEDIUM<br>`description` MEDIUM<br>`priority` MEDIUM<br>`title` MEDIUM<br>+2 more | - |
| PATCH | `/api/v1/tasks/:id/status` | `TaskController.updateTaskStatus` | Yes | - | `status` MEDIUM | - |
| GET | `/api/v1/tasks/efficiency/hotel` | `TaskController.getHotelEfficiencyReport` | Yes | - | - | `fromDate` HIGH<br>`toDate` HIGH |
| GET | `/api/v1/tasks/efficiency/user/:userId` | `TaskController.getUserOph` | Yes | - | - | `fromDate` HIGH<br>`toDate` HIGH |
| GET | `/api/v1/tasks/efficiency/user/:userId/history` | `TaskController.getUserEfficiencyHistory` | Yes | - | - | `fromDate` HIGH<br>`granularity` HIGH<br>`toDate` HIGH |
| GET | `/api/v1/tasks/summary` | `TaskController.getTaskSummary` | Yes | - | - | - |
| GET | `/api/v1/tasks/user/:userId` | `TaskController.getTasksByAssignee` | Yes | - | - | - |
| GET | `/api/v1/user/admin/users` | `UserController.getUsers` | Yes | roles: `MENDADMIN` | - | `availability` HIGH<br>`limit` HIGH<br>`page` HIGH<br>`profession` HIGH<br>+5 more |
| POST | `/api/v1/user/createUser` | `UserController.createUser` | Yes | roles: `ADMIN`, `MANAGER`, `MENDADMIN` | `availability` MEDIUM<br>`departmentRole` MEDIUM<br>`departmentType` MEDIUM<br>`email` MEDIUM<br>+11 more | - |
| DELETE | `/api/v1/user/deleteUser/:id` | `UserController.deleteUser` | Yes | roles: `ADMIN`, `MANAGER`, `MENDADMIN` | - | - |
| GET | `/api/v1/user/getUsers` | `UserController.getUsers` | Yes | roles: `ADMIN`, `MANAGER`, `MENDADMIN` | - | `availability` HIGH<br>`limit` HIGH<br>`page` HIGH<br>`profession` HIGH<br>+5 more |
| PATCH | `/api/v1/user/suspendUser/:id` | `UserController.suspendUser` | Yes | roles: `ADMIN`, `MANAGER`, `MENDADMIN` | - | - |
| PUT | `/api/v1/user/updateUser/:id` | `UserController.updateUser` | Yes | roles: `ADMIN`, `MANAGER`, `MENDADMIN` | `password` MEDIUM<br>`passwordHash` MEDIUM | - |

## POST /api/v1/admin/hotels/:hotelId/block-gigs

- Controller: Unknown
- Source: `src/modules/gigs/gig.route.ts:194`
- Auth required: Yes
- Path params: `hotelId`
- Middleware: `authMiddleware` -> `adminAuthMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## POST /api/v1/admin/login

- Controller: `AdminController.login`
- Source: `src/modules/admin/admin.route.ts:13`
- Auth required: No
- Path params: None
- Middleware: None
- RBAC: None

### Request Body Fields

| Field | Confidence | Source |
| --- | --- | --- |
| `email` | HIGH | direct req.body reference destructuring (src/modules/admin/admin.controller.ts:15) |
| `password` | HIGH | direct req.body reference destructuring (src/modules/admin/admin.controller.ts:15) |

### Query Parameters

None inferred.

## POST /api/v1/admin/Send-Credentials

- Controller: `AdminController.sendCredentials`
- Source: `src/modules/admin/admin.route.ts:18`
- Auth required: Yes
- Path params: None
- Middleware: `authMiddleware` -> `authorizeRoles` -> `tenantMiddleware`
- RBAC: roles: `MENDADMIN`

### Request Body Fields

None inferred.

### Query Parameters

| Field | Confidence | Source |
| --- | --- | --- |
| `hotelId` | HIGH | direct req.query reference destructuring (src/modules/admin/admin.controller.ts:25) |
| `userId` | HIGH | direct req.query reference destructuring (src/modules/admin/admin.controller.ts:25) |

## POST /api/v1/attendance/clock-in

- Controller: `AttendanceController.clockIn`
- Source: `src/modules/attendance/attendence.route.ts:7`
- Auth required: Yes
- Path params: None
- Middleware: `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

| Field | Confidence | Source |
| --- | --- | --- |
| `coords` | MEDIUM | service-layer tracing via parseClockInBody (src/modules/attendance/attendence.controller.ts:52) |
| `deviceId` | MEDIUM | service-layer tracing via parseClockInBody (src/modules/attendance/attendence.controller.ts:58) |
| `hotelId` | HIGH | direct req.body reference destructuring (src/modules/attendance/attendence.controller.ts:25) |
| `offlineQueuedAt` | MEDIUM | service-layer tracing via parseClockInBody (src/modules/attendance/attendence.controller.ts:60) |

### Query Parameters

None inferred.

## POST /api/v1/attendance/clock-out

- Controller: `AttendanceController.clockOut`
- Source: `src/modules/attendance/attendence.route.ts:8`
- Auth required: Yes
- Path params: None
- Middleware: `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

| Field | Confidence | Source |
| --- | --- | --- |
| `coords` | MEDIUM | service-layer tracing via parseClockOutBody (src/modules/attendance/attendence.controller.ts:67) |
| `deviceId` | MEDIUM | service-layer tracing via parseClockOutBody (src/modules/attendance/attendence.controller.ts:73) |
| `hotelId` | HIGH | direct req.body reference destructuring (src/modules/attendance/attendence.controller.ts:39) |
| `offlineQueuedAt` | MEDIUM | service-layer tracing via parseClockOutBody (src/modules/attendance/attendence.controller.ts:75) |

### Query Parameters

None inferred.

## POST /api/v1/auth/login

- Controller: `AuthController.login`
- Source: `src/modules/auth/auth.route.ts:9`
- Auth required: No
- Path params: None
- Middleware: None
- RBAC: None

### Request Body Fields

| Field | Confidence | Source |
| --- | --- | --- |
| `email` | HIGH | direct req.body reference destructuring (src/modules/auth/auth.controller.ts:17) |
| `password` | HIGH | direct req.body reference destructuring (src/modules/auth/auth.controller.ts:17) |

### Query Parameters

None inferred.

## POST /api/v1/auth/logout

- Controller: `AuthController.logout`
- Source: `src/modules/auth/auth.route.ts:11`
- Auth required: Yes
- Path params: None
- Middleware: `authMiddleware`
- RBAC: None

### Request Body Fields

| Field | Confidence | Source |
| --- | --- | --- |
| `sessionId` | HIGH | direct req.body reference destructuring (src/modules/auth/auth.controller.ts:33) |

### Query Parameters

None inferred.

## POST /api/v1/auth/refresh

- Controller: `AuthController.refresh`
- Source: `src/modules/auth/auth.route.ts:10`
- Auth required: No
- Path params: None
- Middleware: None
- RBAC: None

### Request Body Fields

| Field | Confidence | Source |
| --- | --- | --- |
| `refreshToken` | HIGH | direct req.body reference destructuring (src/modules/auth/auth.controller.ts:27) |

### Query Parameters

None inferred.

## POST /api/v1/auth/register

- Controller: `AuthController.register`
- Source: `src/modules/auth/auth.route.ts:8`
- Auth required: No
- Path params: None
- Middleware: None
- RBAC: None

### Request Body Fields

| Field | Confidence | Source |
| --- | --- | --- |
| `city` | HIGH | direct req.body reference destructuring (src/modules/auth/auth.controller.ts:10) |
| `country` | HIGH | direct req.body reference destructuring (src/modules/auth/auth.controller.ts:10) |
| `email` | HIGH | direct req.body reference destructuring (src/modules/auth/auth.controller.ts:10) |
| `firstName` | HIGH | direct req.body reference destructuring (src/modules/auth/auth.controller.ts:10) |
| `lastName` | HIGH | direct req.body reference destructuring (src/modules/auth/auth.controller.ts:10) |
| `password` | HIGH | direct req.body reference destructuring (src/modules/auth/auth.controller.ts:10) |

### Query Parameters

None inferred.

## GET /api/v1/bookings/:id

- Controller: `BookingController.getBookingById`
- Source: `src/modules/gigs/gig.route.ts:157`
- Auth required: Yes
- Path params: `id`
- Middleware: `authMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## PATCH /api/v1/bookings/:id/cancel

- Controller: `BookingController.cancelBooking`
- Source: `src/modules/gigs/gig.route.ts:163`
- Auth required: Yes
- Path params: `id`
- Middleware: `authMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## PATCH /api/v1/bookings/:id/complete

- Controller: `BookingController.completeBooking`
- Source: `src/modules/gigs/gig.route.ts:169`
- Auth required: Yes
- Path params: `id`
- Middleware: `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## PATCH /api/v1/bookings/:id/no-show

- Controller: `BookingController.noShowBooking`
- Source: `src/modules/gigs/gig.route.ts:176`
- Auth required: Yes
- Path params: `id`
- Middleware: `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## PATCH /api/v1/bookings/:id/rate

- Controller: `BookingController.rateBooking`
- Source: `src/modules/gigs/gig.route.ts:183`
- Auth required: Yes
- Path params: `id`
- Middleware: `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## GET /api/v1/bookings/mine

- Controller: `BookingController.getMyBookings`
- Source: `src/modules/gigs/gig.route.ts:63`
- Auth required: Yes
- Path params: None
- Middleware: `authMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

| Field | Confidence | Source |
| --- | --- | --- |
| `limit` | HIGH | direct req.query reference (src/modules/gigs/booking.controller.ts:118) |
| `page` | HIGH | direct req.query reference (src/modules/gigs/booking.controller.ts:117) |
| `status` | HIGH | direct req.query reference (src/modules/gigs/booking.controller.ts:119) |

## GET /api/v1/gigs

- Controller: `GigController.getPublicListings`
- Source: `src/modules/gigs/gig.route.ts:89`
- Auth required: Yes
- Path params: None
- Middleware: `authMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

| Field | Confidence | Source |
| --- | --- | --- |
| `certificationRequired` | HIGH | direct req.query reference (src/modules/gigs/gig.controller.ts:109) |
| `department` | HIGH | direct req.query reference (src/modules/gigs/gig.controller.ts:108) |
| `limit` | HIGH | direct req.query reference (src/modules/gigs/gig.controller.ts:106) |
| `page` | HIGH | direct req.query reference (src/modules/gigs/gig.controller.ts:105) |
| `startAfter` | HIGH | direct req.query reference (src/modules/gigs/gig.controller.ts:110) |
| `startBefore` | HIGH | direct req.query reference (src/modules/gigs/gig.controller.ts:111) |

## POST /api/v1/gigs

- Controller: `GigController.createGig`
- Source: `src/modules/gigs/gig.route.ts:95`
- Auth required: Yes
- Path params: None
- Middleware: `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

| Field | Confidence | Source |
| --- | --- | --- |
| `certificationRequired` | MEDIUM | service-layer tracing via createGig (src/modules/gigs/gig.service.ts:130) |
| `department` | MEDIUM | service-layer tracing via createGig (src/modules/gigs/gig.service.ts:123) |
| `description` | MEDIUM | service-layer tracing via createGig (src/modules/gigs/gig.service.ts:122) |
| `endAt` | MEDIUM | service-layer tracing via createGig (src/modules/gigs/gig.service.ts:127) |
| `rateAmount` | MEDIUM | service-layer tracing via createGig (src/modules/gigs/gig.service.ts:128) |
| `rateUnit` | MEDIUM | service-layer tracing via createGig (src/modules/gigs/gig.service.ts:129) |
| `recoveryPolicy` | MEDIUM | service-layer tracing via createGig (src/modules/gigs/gig.service.ts:112) |
| `requiredSkills` | MEDIUM | service-layer tracing via createGig (src/modules/gigs/gig.service.ts:131) |
| `shiftPolicy` | MEDIUM | service-layer tracing via createGig (src/modules/gigs/gig.service.ts:112) |
| `slots` | MEDIUM | service-layer tracing via createGig (src/modules/gigs/gig.service.ts:124) |
| `startAt` | MEDIUM | service-layer tracing via createGig (src/modules/gigs/gig.service.ts:126) |
| `title` | MEDIUM | service-layer tracing via createGig (src/modules/gigs/gig.service.ts:121) |

### Query Parameters

None inferred.

## GET /api/v1/gigs/:id

- Controller: `GigController.getGigById`
- Source: `src/modules/gigs/gig.route.ts:130`
- Auth required: Yes
- Path params: `id`
- Middleware: `authMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## PUT /api/v1/gigs/:id

- Controller: `GigController.updateGig`
- Source: `src/modules/gigs/gig.route.ts:101`
- Auth required: Yes
- Path params: `id`
- Middleware: `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

| Field | Confidence | Source |
| --- | --- | --- |
| `certificationRequired` | MEDIUM | service-layer tracing via updateGig (src/modules/gigs/gig.service.ts:253) |
| `department` | MEDIUM | service-layer tracing via updateGig (src/modules/gigs/gig.service.ts:251) |
| `description` | MEDIUM | service-layer tracing via updateGig (src/modules/gigs/gig.service.ts:250) |
| `endAt` | MEDIUM | service-layer tracing via updateGig (src/modules/gigs/gig.service.ts:271) |
| `rateAmount` | MEDIUM | service-layer tracing via updateGig (src/modules/gigs/gig.service.ts:256) |
| `rateUnit` | MEDIUM | service-layer tracing via updateGig (src/modules/gigs/gig.service.ts:252) |
| `requiredSkills` | MEDIUM | service-layer tracing via updateGig (src/modules/gigs/gig.service.ts:254) |
| `slots` | MEDIUM | service-layer tracing via updateGig (src/modules/gigs/gig.service.ts:262) |
| `startAt` | MEDIUM | service-layer tracing via updateGig (src/modules/gigs/gig.service.ts:271) |
| `title` | MEDIUM | service-layer tracing via updateGig (src/modules/gigs/gig.service.ts:242) |

### Query Parameters

None inferred.

## POST /api/v1/gigs/:id/book

- Controller: `BookingController.bookGig`
- Source: `src/modules/gigs/gig.route.ts:138`
- Auth required: Yes
- Path params: `id`
- Middleware: `authMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## GET /api/v1/gigs/:id/bookings

- Controller: `BookingController.getBookingsForGig`
- Source: `src/modules/gigs/gig.route.ts:145`
- Auth required: Yes
- Path params: `id`
- Middleware: `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

| Field | Confidence | Source |
| --- | --- | --- |
| `limit` | HIGH | direct req.query reference (src/modules/gigs/booking.controller.ts:101) |
| `page` | HIGH | direct req.query reference (src/modules/gigs/booking.controller.ts:100) |

## PATCH /api/v1/gigs/:id/cancel

- Controller: `GigController.cancelGig`
- Source: `src/modules/gigs/gig.route.ts:119`
- Auth required: Yes
- Path params: `id`
- Middleware: `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## PATCH /api/v1/gigs/:id/close

- Controller: `GigController.closeGig`
- Source: `src/modules/gigs/gig.route.ts:113`
- Auth required: Yes
- Path params: `id`
- Middleware: `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## PATCH /api/v1/gigs/:id/publish

- Controller: `GigController.publishGig`
- Source: `src/modules/gigs/gig.route.ts:107`
- Auth required: Yes
- Path params: `id`
- Middleware: `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## GET /api/v1/gigs/mine

- Controller: `GigController.getHotelGigs`
- Source: `src/modules/gigs/gig.route.ts:78`
- Auth required: Yes
- Path params: None
- Middleware: `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

| Field | Confidence | Source |
| --- | --- | --- |
| `certificationRequired` | HIGH | direct req.query reference (src/modules/gigs/gig.controller.ts:141) |
| `department` | HIGH | direct req.query reference (src/modules/gigs/gig.controller.ts:140) |
| `limit` | HIGH | direct req.query reference (src/modules/gigs/gig.controller.ts:137) |
| `page` | HIGH | direct req.query reference (src/modules/gigs/gig.controller.ts:136) |
| `startAfter` | HIGH | direct req.query reference (src/modules/gigs/gig.controller.ts:142) |
| `startBefore` | HIGH | direct req.query reference (src/modules/gigs/gig.controller.ts:143) |
| `status` | HIGH | direct req.query reference (src/modules/gigs/gig.controller.ts:139) |

## GET /api/v1/gigs/stats

- Controller: `GigController.getGigStats`
- Source: `src/modules/gigs/gig.route.ts:70`
- Auth required: Yes
- Path params: None
- Middleware: `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## GET /api/v1/health

- Controller: Unknown
- Source: `src/modules/index.ts:44`
- Auth required: Yes
- Path params: None
- Middleware: `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## GET /api/v1/hotel/admin/Hotels

- Controller: `HotelController.getHotels`
- Source: `src/modules/hotel/hotel.route.ts:12`
- Auth required: Yes
- Path params: None
- Middleware: `authMiddleware` -> `authorizeRoles`
- RBAC: roles: `MENDADMIN`

### Request Body Fields

None inferred.

### Query Parameters

| Field | Confidence | Source |
| --- | --- | --- |
| `initialPaymentDone` | HIGH | direct req.query reference (src/modules/hotel/hotel.controller.ts:32) |
| `limit` | HIGH | direct req.query reference destructuring (src/modules/hotel/hotel.controller.ts:22) |
| `page` | HIGH | direct req.query reference destructuring (src/modules/hotel/hotel.controller.ts:22) |
| `primaryPainPoint` | HIGH | direct req.query reference (src/modules/hotel/hotel.controller.ts:30) |
| `search` | HIGH | direct req.query reference destructuring (src/modules/hotel/hotel.controller.ts:22) |
| `sortBy` | HIGH | direct req.query reference destructuring (src/modules/hotel/hotel.controller.ts:22) |
| `sortOrder` | HIGH | direct req.query reference destructuring (src/modules/hotel/hotel.controller.ts:22) |

## POST /api/v1/hotel/login

- Controller: `HotelController.login`
- Source: `src/modules/hotel/hotel.route.ts:10`
- Auth required: No
- Path params: None
- Middleware: None
- RBAC: None

### Request Body Fields

| Field | Confidence | Source |
| --- | --- | --- |
| `email` | HIGH | direct req.body reference destructuring (src/modules/hotel/hotel.controller.ts:12) |
| `password` | HIGH | direct req.body reference destructuring (src/modules/hotel/hotel.controller.ts:12) |

### Query Parameters

None inferred.

## POST /api/v1/lms/assessment/attempts/:attemptId/submit

- Controller: `AssessmentController.submitAttempt`
- Source: `src/modules/lms/lms.routes.ts:35`
- Auth required: Yes
- Path params: `attemptId`
- Middleware: `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

| Field | Confidence | Source |
| --- | --- | --- |
| `answers` | HIGH | direct req.body reference (src/modules/lms/assessment/assessment.controller.ts:154) |

### Query Parameters

None inferred.

## GET /api/v1/lms/courses

- Controller: `CourseController.getCourses`
- Source: `src/modules/lms/lms.routes.ts:45`
- Auth required: Yes
- Path params: None
- Middleware: `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

| Field | Confidence | Source |
| --- | --- | --- |
| `category` | HIGH | direct req.query reference destructuring (src/modules/lms/course/course.controller.ts:52) |
| `hotelId` | HIGH | direct req.query reference (src/modules/lms/course/course.controller.ts:46) |
| `limit` | HIGH | direct req.query reference destructuring (src/modules/lms/course/course.controller.ts:52) |
| `page` | HIGH | direct req.query reference destructuring (src/modules/lms/course/course.controller.ts:52) |
| `search` | HIGH | direct req.query reference destructuring (src/modules/lms/course/course.controller.ts:52) |
| `sortBy` | HIGH | direct req.query reference destructuring (src/modules/lms/course/course.controller.ts:52) |
| `sortOrder` | HIGH | direct req.query reference destructuring (src/modules/lms/course/course.controller.ts:52) |
| `status` | HIGH | direct req.query reference destructuring (src/modules/lms/course/course.controller.ts:52) |

## POST /api/v1/lms/courses

- Controller: `CourseController.createCourse`
- Source: `src/modules/lms/lms.routes.ts:50`
- Auth required: Yes
- Path params: None
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `adminOnly`
- RBAC: None

### Request Body Fields

| Field | Confidence | Source |
| --- | --- | --- |
| `category` | HIGH | direct req.body reference destructuring (src/modules/lms/course/course.controller.ts:20) |
| `createdBy` | HIGH | direct req.body reference destructuring (src/modules/lms/course/course.controller.ts:20) |
| `description` | HIGH | direct req.body reference destructuring (src/modules/lms/course/course.controller.ts:20) |
| `hotelId` | HIGH | direct req.body reference destructuring (src/modules/lms/course/course.controller.ts:20) |
| `thumbnailUrl` | HIGH | direct req.body reference destructuring (src/modules/lms/course/course.controller.ts:20) |
| `title` | HIGH | direct req.body reference destructuring (src/modules/lms/course/course.controller.ts:20) |

### Query Parameters

None inferred.

## DELETE /api/v1/lms/courses/:courseId/assessment

- Controller: `AssessmentController.deleteAssessment`
- Source: `src/modules/lms/lms.routes.ts:116`
- Auth required: Yes
- Path params: `courseId`
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `adminOnly`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

| Field | Confidence | Source |
| --- | --- | --- |
| `hotelId` | HIGH | direct req.query reference (src/modules/lms/assessment/assessment.controller.ts:105) |

## GET /api/v1/lms/courses/:courseId/assessment

- Controller: `AssessmentController.getAssessment`
- Source: `src/modules/lms/lms.routes.ts:93`
- Auth required: Yes
- Path params: `courseId`
- Middleware: `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

| Field | Confidence | Source |
| --- | --- | --- |
| `hotelId` | HIGH | direct req.query reference (src/modules/lms/assessment/assessment.controller.ts:44) |

## POST /api/v1/lms/courses/:courseId/assessment

- Controller: `AssessmentController.createAssessment`
- Source: `src/modules/lms/lms.routes.ts:104`
- Auth required: Yes
- Path params: `courseId`
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `adminOnly`
- RBAC: None

### Request Body Fields

| Field | Confidence | Source |
| --- | --- | --- |
| `description` | MEDIUM | service-layer tracing via createAssessment (src/modules/lms/assessment/assessment.service.ts:77) |
| `hotelId` | HIGH | direct req.body reference (src/modules/lms/assessment/assessment.controller.ts:20) |
| `maxAttempts` | MEDIUM | service-layer tracing via createAssessment (src/modules/lms/assessment/assessment.service.ts:80) |
| `passingScore` | MEDIUM | service-layer tracing via createAssessment (src/modules/lms/assessment/assessment.service.ts:79) |
| `questions` | MEDIUM | service-layer tracing via createAssessment (src/modules/lms/assessment/assessment.service.ts:62) |
| `timeLimitMinutes` | MEDIUM | service-layer tracing via createAssessment (src/modules/lms/assessment/assessment.service.ts:81) |
| `title` | MEDIUM | service-layer tracing via createAssessment (src/modules/lms/assessment/assessment.service.ts:76) |

### Query Parameters

None inferred.

## PUT /api/v1/lms/courses/:courseId/assessment

- Controller: `AssessmentController.updateAssessment`
- Source: `src/modules/lms/lms.routes.ts:110`
- Auth required: Yes
- Path params: `courseId`
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `adminOnly`
- RBAC: None

### Request Body Fields

| Field | Confidence | Source |
| --- | --- | --- |
| `*` | LOW | service-layer tracing via updateAssessment spread (src/modules/lms/assessment/assessment.service.ts:152) |
| `description` | MEDIUM | service-layer tracing via updateAssessment (src/modules/lms/assessment/assessment.service.ts:134) |
| `hotelId` | HIGH | direct req.body reference (src/modules/lms/assessment/assessment.controller.ts:83) |
| `maxAttempts` | MEDIUM | service-layer tracing via updateAssessment (src/modules/lms/assessment/assessment.service.ts:141) |
| `passingScore` | MEDIUM | service-layer tracing via updateAssessment (src/modules/lms/assessment/assessment.service.ts:136) |
| `questions` | MEDIUM | service-layer tracing via updateAssessment (src/modules/lms/assessment/assessment.service.ts:151) |
| `timeLimitMinutes` | MEDIUM | service-layer tracing via updateAssessment (src/modules/lms/assessment/assessment.service.ts:146) |
| `title` | MEDIUM | service-layer tracing via updateAssessment (src/modules/lms/assessment/assessment.service.ts:130) |

### Query Parameters

None inferred.

## GET /api/v1/lms/courses/:courseId/assessment/answers

- Controller: `AssessmentController.getAssessmentWithAnswers`
- Source: `src/modules/lms/lms.routes.ts:98`
- Auth required: Yes
- Path params: `courseId`
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `adminOnly`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

| Field | Confidence | Source |
| --- | --- | --- |
| `hotelId` | HIGH | direct req.query reference (src/modules/lms/assessment/assessment.controller.ts:62) |

## POST /api/v1/lms/courses/:courseId/assessment/attempt

- Controller: `AssessmentController.startAttempt`
- Source: `src/modules/lms/lms.routes.ts:122`
- Auth required: Yes
- Path params: `courseId`
- Middleware: `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## GET /api/v1/lms/courses/:courseId/assessment/attempts

- Controller: `AssessmentController.getMyAttempts`
- Source: `src/modules/lms/lms.routes.ts:127`
- Auth required: Yes
- Path params: `courseId`
- Middleware: `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## GET /api/v1/lms/courses/:courseId/certificate

- Controller: `AssessmentController.getMyCertificate`
- Source: `src/modules/lms/lms.routes.ts:132`
- Auth required: Yes
- Path params: `courseId`
- Middleware: `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## DELETE /api/v1/lms/courses/:courseId/enroll

- Controller: `EnrollmentController.drop`
- Source: `src/modules/lms/lms.routes.ts:77`
- Auth required: Yes
- Path params: `courseId`
- Middleware: `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## POST /api/v1/lms/courses/:courseId/enroll

- Controller: `EnrollmentController.enroll`
- Source: `src/modules/lms/lms.routes.ts:74`
- Auth required: Yes
- Path params: `courseId`
- Middleware: `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## GET /api/v1/lms/courses/:courseId/enrollment

- Controller: `EnrollmentController.getEnrollment`
- Source: `src/modules/lms/lms.routes.ts:80`
- Auth required: Yes
- Path params: `courseId`
- Middleware: `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## GET /api/v1/lms/courses/:courseId/lectures

- Controller: `LectureController.getLectures`
- Source: `src/modules/lms/lms.routes.ts:60`
- Auth required: Yes
- Path params: `courseId`
- Middleware: `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

| Field | Confidence | Source |
| --- | --- | --- |
| `hotelId` | HIGH | direct req.query reference (src/modules/lms/lecture/lecture.controller.ts:35) |

## POST /api/v1/lms/courses/:courseId/lectures

- Controller: `LectureController.createLecture`
- Source: `src/modules/lms/lms.routes.ts:64`
- Auth required: Yes
- Path params: `courseId`
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `adminOnly`
- RBAC: None

### Request Body Fields

| Field | Confidence | Source |
| --- | --- | --- |
| `description` | HIGH | direct req.body reference destructuring (src/modules/lms/lecture/lecture.controller.ts:24) |
| `duration` | HIGH | direct req.body reference destructuring (src/modules/lms/lecture/lecture.controller.ts:24) |
| `hotelId` | HIGH | direct req.body reference (src/modules/lms/lecture/lecture.controller.ts:18) |
| `notes` | HIGH | direct req.body reference destructuring (src/modules/lms/lecture/lecture.controller.ts:24) |
| `title` | HIGH | direct req.body reference destructuring (src/modules/lms/lecture/lecture.controller.ts:24) |
| `videoUrl` | HIGH | direct req.body reference destructuring (src/modules/lms/lecture/lecture.controller.ts:24) |

### Query Parameters

None inferred.

## DELETE /api/v1/lms/courses/:courseId/lectures/:id

- Controller: `LectureController.deleteLecture`
- Source: `src/modules/lms/lms.routes.ts:67`
- Auth required: Yes
- Path params: `courseId`, `id`
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `adminOnly`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

| Field | Confidence | Source |
| --- | --- | --- |
| `hotelId` | HIGH | direct req.query reference (src/modules/lms/lecture/lecture.controller.ts:86) |

## GET /api/v1/lms/courses/:courseId/lectures/:id

- Controller: `LectureController.getLectureById`
- Source: `src/modules/lms/lms.routes.ts:61`
- Auth required: Yes
- Path params: `courseId`, `id`
- Middleware: `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

| Field | Confidence | Source |
| --- | --- | --- |
| `hotelId` | HIGH | direct req.query reference (src/modules/lms/lecture/lecture.controller.ts:51) |

## PUT /api/v1/lms/courses/:courseId/lectures/:id

- Controller: `LectureController.updateLecture`
- Source: `src/modules/lms/lms.routes.ts:66`
- Auth required: Yes
- Path params: `courseId`, `id`
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `adminOnly`
- RBAC: None

### Request Body Fields

| Field | Confidence | Source |
| --- | --- | --- |
| `description` | HIGH | direct req.body reference destructuring (src/modules/lms/lecture/lecture.controller.ts:75) |
| `duration` | HIGH | direct req.body reference destructuring (src/modules/lms/lecture/lecture.controller.ts:75) |
| `hotelId` | HIGH | direct req.body reference (src/modules/lms/lecture/lecture.controller.ts:68) |
| `notes` | HIGH | direct req.body reference destructuring (src/modules/lms/lecture/lecture.controller.ts:75) |
| `title` | HIGH | direct req.body reference destructuring (src/modules/lms/lecture/lecture.controller.ts:75) |
| `videoUrl` | HIGH | direct req.body reference destructuring (src/modules/lms/lecture/lecture.controller.ts:75) |

### Query Parameters

None inferred.

## POST /api/v1/lms/courses/:courseId/lectures/:lectureId/complete

- Controller: `EnrollmentController.markLectureComplete`
- Source: `src/modules/lms/lms.routes.ts:83`
- Auth required: Yes
- Path params: `courseId`, `lectureId`
- Middleware: `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## PATCH /api/v1/lms/courses/:courseId/lectures/reorder

- Controller: `LectureController.reorderLectures`
- Source: `src/modules/lms/lms.routes.ts:65`
- Auth required: Yes
- Path params: `courseId`
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `adminOnly`
- RBAC: None

### Request Body Fields

| Field | Confidence | Source |
| --- | --- | --- |
| `hotelId` | HIGH | direct req.body reference (src/modules/lms/lecture/lecture.controller.ts:103) |
| `orderedIds` | HIGH | direct req.body reference destructuring (src/modules/lms/lecture/lecture.controller.ts:109) |

### Query Parameters

None inferred.

## DELETE /api/v1/lms/courses/:id

- Controller: `CourseController.deleteCourse`
- Source: `src/modules/lms/lms.routes.ts:53`
- Auth required: Yes
- Path params: `id`
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `adminOnly`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

| Field | Confidence | Source |
| --- | --- | --- |
| `hotelId` | HIGH | direct req.query reference (src/modules/lms/course/course.controller.ts:157) |

## GET /api/v1/lms/courses/:id

- Controller: `CourseController.getCourseById`
- Source: `src/modules/lms/lms.routes.ts:47`
- Auth required: Yes
- Path params: `id`
- Middleware: `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

| Field | Confidence | Source |
| --- | --- | --- |
| `hotelId` | HIGH | direct req.query reference (src/modules/lms/course/course.controller.ts:84) |

## PUT /api/v1/lms/courses/:id

- Controller: `CourseController.updateCourse`
- Source: `src/modules/lms/lms.routes.ts:51`
- Auth required: Yes
- Path params: `id`
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `adminOnly`
- RBAC: None

### Request Body Fields

| Field | Confidence | Source |
| --- | --- | --- |
| `category` | HIGH | direct req.body reference destructuring (src/modules/lms/course/course.controller.ts:123) |
| `description` | HIGH | direct req.body reference destructuring (src/modules/lms/course/course.controller.ts:123) |
| `hotelId` | HIGH | direct req.body reference (src/modules/lms/course/course.controller.ts:116) |
| `thumbnailUrl` | HIGH | direct req.body reference destructuring (src/modules/lms/course/course.controller.ts:123) |
| `title` | HIGH | direct req.body reference destructuring (src/modules/lms/course/course.controller.ts:123) |

### Query Parameters

None inferred.

## GET /api/v1/lms/courses/:id/full

- Controller: `CourseController.getCourseWithLectures`
- Source: `src/modules/lms/lms.routes.ts:46`
- Auth required: Yes
- Path params: `id`
- Middleware: `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

| Field | Confidence | Source |
| --- | --- | --- |
| `hotelId` | HIGH | direct req.query reference (src/modules/lms/course/course.controller.ts:100) |

## PATCH /api/v1/lms/courses/:id/status

- Controller: `CourseController.updateCourseStatus`
- Source: `src/modules/lms/lms.routes.ts:52`
- Auth required: Yes
- Path params: `id`
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `adminOnly`
- RBAC: None

### Request Body Fields

| Field | Confidence | Source |
| --- | --- | --- |
| `hotelId` | HIGH | direct req.body reference (src/modules/lms/course/course.controller.ts:134) |
| `status` | HIGH | direct req.body reference destructuring (src/modules/lms/course/course.controller.ts:141) |

### Query Parameters

None inferred.

## GET /api/v1/lms/my/certificates

- Controller: `AssessmentController.getMyCertificates`
- Source: `src/modules/lms/lms.routes.ts:32`
- Auth required: Yes
- Path params: None
- Middleware: `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## GET /api/v1/lms/my/dashboard

- Controller: `EnrollmentController.getLearningDashboard`
- Source: `src/modules/lms/lms.routes.ts:26`
- Auth required: Yes
- Path params: None
- Middleware: `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## GET /api/v1/lms/my/enrollments

- Controller: `EnrollmentController.getMyEnrollments`
- Source: `src/modules/lms/lms.routes.ts:29`
- Auth required: Yes
- Path params: None
- Middleware: `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

| Field | Confidence | Source |
| --- | --- | --- |
| `status` | HIGH | direct req.query reference (src/modules/lms/enrollment/enrollment.controller.ts:123) |

## POST /api/v1/payment/create-payment

- Controller: `PaymentController.create`
- Source: `src/modules/payment/payment.route.ts:7`
- Auth required: No
- Path params: None
- Middleware: None
- RBAC: None

### Request Body Fields

| Field | Confidence | Source |
| --- | --- | --- |
| `amount` | HIGH | direct req.body reference destructuring (src/modules/payment/payment.controller.ts:20) |
| `orderId` | HIGH | direct req.body reference destructuring (src/modules/payment/payment.controller.ts:20) |

### Query Parameters

None inferred.

## GET /api/v1/payment/delete-payment-entry

- Controller: `PaymentController.deletePaymentEntry`
- Source: `src/modules/payment/payment.route.ts:10`
- Auth required: No
- Path params: None
- Middleware: None
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

| Field | Confidence | Source |
| --- | --- | --- |
| `id` | HIGH | direct req.query reference destructuring (src/modules/payment/payment.controller.ts:81) |
| `orderId` | HIGH | direct req.query reference destructuring (src/modules/payment/payment.controller.ts:81) |
| `type` | HIGH | direct req.query reference destructuring (src/modules/payment/payment.controller.ts:81) |

## POST /api/v1/payment/initiate-payment

- Controller: `PaymentController.initiate`
- Source: `src/modules/payment/payment.route.ts:8`
- Auth required: No
- Path params: None
- Middleware: None
- RBAC: None

### Request Body Fields

| Field | Confidence | Source |
| --- | --- | --- |
| `hotel` | HIGH | direct req.body reference destructuring (src/modules/payment/payment.controller.ts:27) |
| `orderId` | HIGH | direct req.body reference destructuring (src/modules/payment/payment.controller.ts:27) |
| `user` | HIGH | direct req.body reference destructuring (src/modules/payment/payment.controller.ts:27) |

### Query Parameters

None inferred.

## GET /api/v1/payment/payment-status/:orderId

- Controller: `PaymentController.getStatus`
- Source: `src/modules/payment/payment.route.ts:9`
- Auth required: No
- Path params: `orderId`
- Middleware: None
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

| Field | Confidence | Source |
| --- | --- | --- |
| `id` | HIGH | direct req.query reference destructuring (src/modules/payment/payment.controller.ts:62) |
| `type` | HIGH | direct req.query reference destructuring (src/modules/payment/payment.controller.ts:62) |

## GET /api/v1/rbac/available-options

- Controller: Unknown
- Source: `src/modules/rbac/rbac.route.ts:12`
- Auth required: Yes
- Path params: None
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `authMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## GET /api/v1/rbac/hotel/:hotelId

- Controller: Unknown
- Source: `src/modules/rbac/rbac.route.ts:21`
- Auth required: Yes
- Path params: `hotelId`
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `authMiddleware` -> `authorize`
- RBAC: permissions: `MANAGE_RBAC`

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## GET /api/v1/rbac/hotel/:hotelId/check

- Controller: Unknown
- Source: `src/modules/rbac/rbac.route.ts:49`
- Auth required: Yes
- Path params: `hotelId`
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `authMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## POST /api/v1/rbac/hotel/:hotelId/clone-permissions

- Controller: Unknown
- Source: `src/modules/rbac/rbac.route.ts:98`
- Auth required: Yes
- Path params: `hotelId`
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `authMiddleware` -> `authorize`
- RBAC: permissions: `MANAGE_RBAC`

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## POST /api/v1/rbac/hotel/:hotelId/permission

- Controller: Unknown
- Source: `src/modules/rbac/rbac.route.ts:58`
- Auth required: Yes
- Path params: `hotelId`
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `authMiddleware` -> `authorize`
- RBAC: permissions: `MANAGE_RBAC`

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## GET /api/v1/rbac/hotel/:hotelId/role

- Controller: Unknown
- Source: `src/modules/rbac/rbac.route.ts:31`
- Auth required: Yes
- Path params: `hotelId`
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `authMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## GET /api/v1/rbac/hotel/:hotelId/user-permissions

- Controller: Unknown
- Source: `src/modules/rbac/rbac.route.ts:40`
- Auth required: Yes
- Path params: `hotelId`
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `authMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## DELETE /api/v1/rbac/permission/:id

- Controller: Unknown
- Source: `src/modules/rbac/rbac.route.ts:68`
- Auth required: Yes
- Path params: `id`
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `authMiddleware` -> `authorize`
- RBAC: permissions: `MANAGE_RBAC`

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## PATCH /api/v1/rbac/permission/:id/disable

- Controller: Unknown
- Source: `src/modules/rbac/rbac.route.ts:78`
- Auth required: Yes
- Path params: `id`
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `authMiddleware` -> `authorize`
- RBAC: permissions: `MANAGE_RBAC`

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## PATCH /api/v1/rbac/permission/:id/enable

- Controller: Unknown
- Source: `src/modules/rbac/rbac.route.ts:88`
- Auth required: Yes
- Path params: `id`
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `authMiddleware` -> `authorize`
- RBAC: permissions: `MANAGE_RBAC`

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## POST /api/v1/recruitment/admin/hotels/:hotelId/block

- Controller: `RecruitmentController.blockHotelJobs`
- Source: `src/modules/recruitment/recruitment.route.ts:180`
- Auth required: Yes
- Path params: `hotelId`
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `authMiddleware` -> `adminAuthMiddleware`
- RBAC: None

### Request Body Fields

| Field | Confidence | Source |
| --- | --- | --- |
| `reason` | HIGH | direct req.body reference destructuring (src/modules/recruitment/recruitment.controller.ts:414) |

### Query Parameters

None inferred.

## GET /api/v1/recruitment/applications

- Controller: `RecruitmentController.getHotelApplications`
- Source: `src/modules/recruitment/recruitment.route.ts:57`
- Auth required: Yes
- Path params: None
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

| Field | Confidence | Source |
| --- | --- | --- |
| `jobId` | HIGH | direct req.query reference (src/modules/recruitment/recruitment.controller.ts:356) |
| `limit` | HIGH | direct req.query reference (src/modules/recruitment/recruitment.controller.ts:354) |
| `page` | HIGH | direct req.query reference (src/modules/recruitment/recruitment.controller.ts:353) |
| `sortBy` | HIGH | direct req.query reference (src/modules/recruitment/recruitment.controller.ts:361) |
| `sortOrder` | HIGH | direct req.query reference (src/modules/recruitment/recruitment.controller.ts:362) |
| `status` | HIGH | direct req.query reference (src/modules/recruitment/recruitment.controller.ts:355) |

## GET /api/v1/recruitment/applications/:id

- Controller: `RecruitmentController.getApplicationById`
- Source: `src/modules/recruitment/recruitment.route.ts:151`
- Auth required: Yes
- Path params: `id`
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `authMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## PATCH /api/v1/recruitment/applications/:id/rate

- Controller: `RecruitmentController.rateApplication`
- Source: `src/modules/recruitment/recruitment.route.ts:170`
- Auth required: Yes
- Path params: `id`
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

| Field | Confidence | Source |
| --- | --- | --- |
| `rating` | HIGH | direct req.body reference destructuring (src/modules/recruitment/recruitment.controller.ts:275) |

### Query Parameters

None inferred.

## PATCH /api/v1/recruitment/applications/:id/review

- Controller: `RecruitmentController.reviewApplication`
- Source: `src/modules/recruitment/recruitment.route.ts:163`
- Auth required: Yes
- Path params: `id`
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

| Field | Confidence | Source |
| --- | --- | --- |
| `recruiterNotes` | HIGH | direct req.body reference destructuring (src/modules/recruitment/recruitment.controller.ts:244) |
| `status` | HIGH | direct req.body reference destructuring (src/modules/recruitment/recruitment.controller.ts:244) |

### Query Parameters

None inferred.

## PATCH /api/v1/recruitment/applications/:id/withdraw

- Controller: `RecruitmentController.withdrawApplication`
- Source: `src/modules/recruitment/recruitment.route.ts:157`
- Auth required: Yes
- Path params: `id`
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `authMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## GET /api/v1/recruitment/applications/mine

- Controller: `RecruitmentController.getMyApplications`
- Source: `src/modules/recruitment/recruitment.route.ts:51`
- Auth required: Yes
- Path params: None
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `authMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

| Field | Confidence | Source |
| --- | --- | --- |
| `limit` | HIGH | direct req.query reference (src/modules/recruitment/recruitment.controller.ts:300) |
| `page` | HIGH | direct req.query reference (src/modules/recruitment/recruitment.controller.ts:299) |
| `sortBy` | HIGH | direct req.query reference (src/modules/recruitment/recruitment.controller.ts:306) |
| `sortOrder` | HIGH | direct req.query reference (src/modules/recruitment/recruitment.controller.ts:307) |
| `status` | HIGH | direct req.query reference (src/modules/recruitment/recruitment.controller.ts:301) |

## GET /api/v1/recruitment/jobs

- Controller: `RecruitmentController.getPublicListings`
- Source: `src/modules/recruitment/recruitment.route.ts:81`
- Auth required: Yes
- Path params: None
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `authMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

| Field | Confidence | Source |
| --- | --- | --- |
| `certificationRequired` | HIGH | direct req.query reference (src/modules/recruitment/recruitment.controller.ts:113) |
| `department` | HIGH | direct req.query reference (src/modules/recruitment/recruitment.controller.ts:111) |
| `employmentType` | HIGH | direct req.query reference (src/modules/recruitment/recruitment.controller.ts:112) |
| `limit` | HIGH | direct req.query reference (src/modules/recruitment/recruitment.controller.ts:109) |
| `page` | HIGH | direct req.query reference (src/modules/recruitment/recruitment.controller.ts:108) |
| `search` | HIGH | direct req.query reference (src/modules/recruitment/recruitment.controller.ts:127) |
| `sortBy` | HIGH | direct req.query reference (src/modules/recruitment/recruitment.controller.ts:118) |
| `sortOrder` | HIGH | direct req.query reference (src/modules/recruitment/recruitment.controller.ts:119) |

## POST /api/v1/recruitment/jobs

- Controller: `RecruitmentController.createJob`
- Source: `src/modules/recruitment/recruitment.route.ts:87`
- Auth required: Yes
- Path params: None
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

| Field | Confidence | Source |
| --- | --- | --- |
| `certificationRequired` | MEDIUM | service-layer tracing via createJob (src/modules/recruitment/recruitment.service.ts:190) |
| `department` | MEDIUM | service-layer tracing via createJob (src/modules/recruitment/recruitment.service.ts:185) |
| `description` | MEDIUM | service-layer tracing via createJob (src/modules/recruitment/recruitment.service.ts:184) |
| `employmentType` | MEDIUM | service-layer tracing via createJob (src/modules/recruitment/recruitment.service.ts:186) |
| `experienceRequired` | MEDIUM | service-layer tracing via createJob (src/modules/recruitment/recruitment.service.ts:192) |
| `expiresAt` | MEDIUM | service-layer tracing via createJob (src/modules/recruitment/recruitment.service.ts:197) |
| `recoveryPolicy` | MEDIUM | service-layer tracing via createJob (src/modules/recruitment/recruitment.service.ts:174) |
| `requiredSkills` | MEDIUM | service-layer tracing via createJob (src/modules/recruitment/recruitment.service.ts:191) |
| `salaryCurrency` | MEDIUM | service-layer tracing via createJob (src/modules/recruitment/recruitment.service.ts:195) |
| `salaryMax` | MEDIUM | service-layer tracing via createJob (src/modules/recruitment/recruitment.service.ts:194) |
| `salaryMin` | MEDIUM | service-layer tracing via createJob (src/modules/recruitment/recruitment.service.ts:193) |
| `shiftPolicy` | MEDIUM | service-layer tracing via createJob (src/modules/recruitment/recruitment.service.ts:174) |
| `title` | MEDIUM | service-layer tracing via createJob (src/modules/recruitment/recruitment.service.ts:183) |
| `vacancies` | MEDIUM | service-layer tracing via createJob (src/modules/recruitment/recruitment.service.ts:187) |

### Query Parameters

None inferred.

## DELETE /api/v1/recruitment/jobs/:id

- Controller: `RecruitmentController.deleteJob`
- Source: `src/modules/recruitment/recruitment.route.ts:111`
- Auth required: Yes
- Path params: `id`
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## GET /api/v1/recruitment/jobs/:id

- Controller: `RecruitmentController.getJobById`
- Source: `src/modules/recruitment/recruitment.route.ts:121`
- Auth required: Yes
- Path params: `id`
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `authMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## PUT /api/v1/recruitment/jobs/:id

- Controller: `RecruitmentController.updateJob`
- Source: `src/modules/recruitment/recruitment.route.ts:93`
- Auth required: Yes
- Path params: `id`
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

| Field | Confidence | Source |
| --- | --- | --- |
| `certificationRequired` | MEDIUM | service-layer tracing via updateJob (src/modules/recruitment/recruitment.service.ts:284) |
| `department` | MEDIUM | service-layer tracing via updateJob (src/modules/recruitment/recruitment.service.ts:276) |
| `description` | MEDIUM | service-layer tracing via updateJob (src/modules/recruitment/recruitment.service.ts:275) |
| `employmentType` | MEDIUM | service-layer tracing via updateJob (src/modules/recruitment/recruitment.service.ts:277) |
| `experienceRequired` | MEDIUM | service-layer tracing via updateJob (src/modules/recruitment/recruitment.service.ts:286) |
| `expiresAt` | MEDIUM | service-layer tracing via updateJob (src/modules/recruitment/recruitment.service.ts:290) |
| `recoveryPolicy` | MEDIUM | service-layer tracing via updateJob (src/modules/recruitment/recruitment.service.ts:283) |
| `requiredSkills` | MEDIUM | service-layer tracing via updateJob (src/modules/recruitment/recruitment.service.ts:285) |
| `salaryCurrency` | MEDIUM | service-layer tracing via updateJob (src/modules/recruitment/recruitment.service.ts:289) |
| `salaryMax` | MEDIUM | service-layer tracing via updateJob (src/modules/recruitment/recruitment.service.ts:288) |
| `salaryMin` | MEDIUM | service-layer tracing via updateJob (src/modules/recruitment/recruitment.service.ts:287) |
| `shiftPolicy` | MEDIUM | service-layer tracing via updateJob (src/modules/recruitment/recruitment.service.ts:282) |
| `title` | MEDIUM | service-layer tracing via updateJob (src/modules/recruitment/recruitment.service.ts:271) |
| `vacancies` | MEDIUM | service-layer tracing via updateJob (src/modules/recruitment/recruitment.service.ts:278) |

### Query Parameters

None inferred.

## GET /api/v1/recruitment/jobs/:id/applications

- Controller: `RecruitmentController.getApplicationsForJob`
- Source: `src/modules/recruitment/recruitment.route.ts:140`
- Auth required: Yes
- Path params: `id`
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

| Field | Confidence | Source |
| --- | --- | --- |
| `limit` | HIGH | direct req.query reference (src/modules/recruitment/recruitment.controller.ts:327) |
| `page` | HIGH | direct req.query reference (src/modules/recruitment/recruitment.controller.ts:326) |
| `sortBy` | HIGH | direct req.query reference (src/modules/recruitment/recruitment.controller.ts:333) |
| `sortOrder` | HIGH | direct req.query reference (src/modules/recruitment/recruitment.controller.ts:334) |
| `status` | HIGH | direct req.query reference (src/modules/recruitment/recruitment.controller.ts:328) |

## GET /api/v1/recruitment/jobs/:id/applications/stats

- Controller: `RecruitmentController.getApplicationStats`
- Source: `src/modules/recruitment/recruitment.route.ts:134`
- Auth required: Yes
- Path params: `id`
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## POST /api/v1/recruitment/jobs/:id/apply

- Controller: `RecruitmentController.applyToJob`
- Source: `src/modules/recruitment/recruitment.route.ts:128`
- Auth required: Yes
- Path params: `id`
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `authMiddleware`
- RBAC: None

### Request Body Fields

| Field | Confidence | Source |
| --- | --- | --- |
| `coverNote` | MEDIUM | service-layer tracing via applyToJob (src/modules/recruitment/recruitment.service.ts:395) |

### Query Parameters

None inferred.

## PATCH /api/v1/recruitment/jobs/:id/close

- Controller: `RecruitmentController.closeJob`
- Source: `src/modules/recruitment/recruitment.route.ts:105`
- Auth required: Yes
- Path params: `id`
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## PATCH /api/v1/recruitment/jobs/:id/publish

- Controller: `RecruitmentController.publishJob`
- Source: `src/modules/recruitment/recruitment.route.ts:99`
- Auth required: Yes
- Path params: `id`
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## GET /api/v1/recruitment/jobs/mine

- Controller: `RecruitmentController.getHotelJobs`
- Source: `src/modules/recruitment/recruitment.route.ts:71`
- Auth required: Yes
- Path params: None
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

| Field | Confidence | Source |
| --- | --- | --- |
| `department` | HIGH | direct req.query reference (src/modules/recruitment/recruitment.controller.ts:147) |
| `limit` | HIGH | direct req.query reference (src/modules/recruitment/recruitment.controller.ts:144) |
| `page` | HIGH | direct req.query reference (src/modules/recruitment/recruitment.controller.ts:143) |
| `search` | HIGH | direct req.query reference (src/modules/recruitment/recruitment.controller.ts:159) |
| `sortBy` | HIGH | direct req.query reference (src/modules/recruitment/recruitment.controller.ts:152) |
| `sortOrder` | HIGH | direct req.query reference (src/modules/recruitment/recruitment.controller.ts:153) |
| `status` | HIGH | direct req.query reference (src/modules/recruitment/recruitment.controller.ts:146) |

## GET /api/v1/recruitment/jobs/stats

- Controller: `RecruitmentController.getJobStats`
- Source: `src/modules/recruitment/recruitment.route.ts:64`
- Auth required: Yes
- Path params: None
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## POST /api/v1/roster/createRoster

- Controller: `RosterController.createOrUpdateRosters`
- Source: `src/modules/rosters/roster.routes.ts:13`
- Auth required: Yes
- Path params: None
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `authorizeRoles`
- RBAC: roles: `ADMIN`, `MANAGER`, `MENDADMIN`

### Request Body Fields

| Field | Confidence | Source |
| --- | --- | --- |
| `employees` | MEDIUM | service-layer tracing via createOrUpdateRosters destructuring (src/modules/rosters/roster.service.ts:13) |
| `fromDate` | MEDIUM | service-layer tracing via createOrUpdateRosters destructuring (src/modules/rosters/roster.service.ts:13) |
| `shiftId` | MEDIUM | service-layer tracing via createOrUpdateRosters destructuring (src/modules/rosters/roster.service.ts:13) |
| `toDate` | MEDIUM | service-layer tracing via createOrUpdateRosters destructuring (src/modules/rosters/roster.service.ts:13) |

### Query Parameters

None inferred.

## DELETE /api/v1/roster/deleteRoster/:id

- Controller: `RosterController.deleteRoster`
- Source: `src/modules/rosters/roster.routes.ts:22`
- Auth required: Yes
- Path params: `id`
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `authorizeRoles`
- RBAC: roles: `ADMIN`, `MANAGER`, `MENDADMIN`

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## GET /api/v1/roster/getAllRosters

- Controller: `RosterController.getAllRosters`
- Source: `src/modules/rosters/roster.routes.ts:16`
- Auth required: Yes
- Path params: None
- Middleware: `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## GET /api/v1/roster/getRosterById/:id

- Controller: `RosterController.getRosterById`
- Source: `src/modules/rosters/roster.routes.ts:17`
- Auth required: Yes
- Path params: `id`
- Middleware: `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## GET /api/v1/roster/getShiftRosters/:shiftId

- Controller: `RosterController.getShiftRosters`
- Source: `src/modules/rosters/roster.routes.ts:18`
- Auth required: Yes
- Path params: `shiftId`
- Middleware: `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## PUT /api/v1/roster/updateRoster/:id

- Controller: `RosterController.updateRoster`
- Source: `src/modules/rosters/roster.routes.ts:21`
- Auth required: Yes
- Path params: `id`
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `authorizeRoles`
- RBAC: roles: `ADMIN`, `MANAGER`, `MENDADMIN`

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## POST /api/v1/shift/createShift

- Controller: `ShiftController.createShift`
- Source: `src/modules/shift/shift.routes.ts:14`
- Auth required: Yes
- Path params: None
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `authorizeRoles`
- RBAC: roles: `ADMIN`, `MANAGER`, `MENDADMIN`

### Request Body Fields

| Field | Confidence | Source |
| --- | --- | --- |
| `employees` | MEDIUM | service-layer tracing via createShift destructuring (src/modules/shift/shift.service.ts:9) |
| `endTime` | MEDIUM | service-layer tracing via createShift destructuring (src/modules/shift/shift.service.ts:9) |
| `startTime` | MEDIUM | service-layer tracing via createShift destructuring (src/modules/shift/shift.service.ts:9) |

### Query Parameters

None inferred.

## DELETE /api/v1/shift/deleteShift/:id

- Controller: `ShiftController.deleteShift`
- Source: `src/modules/shift/shift.routes.ts:18`
- Auth required: Yes
- Path params: `id`
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `authorizeRoles`
- RBAC: roles: `ADMIN`, `MANAGER`, `MENDADMIN`

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## GET /api/v1/shift/getAllShifts

- Controller: `ShiftController.getAllShifts`
- Source: `src/modules/shift/shift.routes.ts:13`
- Auth required: Yes
- Path params: None
- Middleware: `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## GET /api/v1/shift/getShiftById/:id

- Controller: `ShiftController.getShiftById`
- Source: `src/modules/shift/shift.routes.ts:16`
- Auth required: Yes
- Path params: `id`
- Middleware: `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## GET /api/v1/shift/getUserShifts/:userId

- Controller: `ShiftController.getUserShifts`
- Source: `src/modules/shift/shift.routes.ts:15`
- Auth required: Yes
- Path params: `userId`
- Middleware: `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## PUT /api/v1/shift/updateShift/:id

- Controller: `ShiftController.updateShift`
- Source: `src/modules/shift/shift.routes.ts:17`
- Auth required: Yes
- Path params: `id`
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `authorizeRoles`
- RBAC: roles: `ADMIN`, `MANAGER`, `MENDADMIN`

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## GET /api/v1/sos

- Controller: `SOSController.getSOSAlerts`
- Source: `src/modules/sos/sos.route.ts:8`
- Auth required: Yes
- Path params: None
- Middleware: `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

| Field | Confidence | Source |
| --- | --- | --- |
| `hotelId` | HIGH | direct req.query reference (src/modules/sos/sos.controller.ts:33) |
| `limit` | HIGH | direct req.query reference (src/modules/sos/sos.controller.ts:35) |
| `offset` | HIGH | direct req.query reference (src/modules/sos/sos.controller.ts:36) |
| `status` | HIGH | direct req.query reference (src/modules/sos/sos.controller.ts:34) |

## GET /api/v1/sos/:id

- Controller: `SOSController.getSOSById`
- Source: `src/modules/sos/sos.route.ts:9`
- Auth required: Yes
- Path params: `id`
- Middleware: `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## PUT /api/v1/sos/:id/escalate

- Controller: `SOSController.escalateSOS`
- Source: `src/modules/sos/sos.route.ts:10`
- Auth required: Yes
- Path params: `id`
- Middleware: `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

| Field | Confidence | Source |
| --- | --- | --- |
| `level` | HIGH | direct req.body reference destructuring (src/modules/sos/sos.controller.ts:67) |

### Query Parameters

None inferred.

## PUT /api/v1/sos/:id/resolve

- Controller: `SOSController.resolveSOS`
- Source: `src/modules/sos/sos.route.ts:11`
- Auth required: Yes
- Path params: `id`
- Middleware: `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## POST /api/v1/sos/trigger

- Controller: `SOSController.triggerSOS`
- Source: `src/modules/sos/sos.route.ts:7`
- Auth required: Yes
- Path params: None
- Middleware: `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

| Field | Confidence | Source |
| --- | --- | --- |
| `coords` | MEDIUM | service-layer tracing via parseTriggerBody (src/modules/sos/sos.controller.ts:92) |
| `message` | MEDIUM | service-layer tracing via parseTriggerBody (src/modules/sos/sos.controller.ts:98) |

### Query Parameters

None inferred.

## GET /api/v1/tasks

- Controller: `TaskController.listTasks`
- Source: `src/modules/tasks/task.route.ts:44`
- Auth required: Yes
- Path params: None
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

| Field | Confidence | Source |
| --- | --- | --- |
| `assignedBy` | HIGH | direct req.query reference (src/modules/tasks/task.controller.ts:91) |
| `assignedTo` | HIGH | direct req.query reference (src/modules/tasks/task.controller.ts:90) |
| `fromDate` | HIGH | direct req.query reference (src/modules/tasks/task.controller.ts:93) |
| `limit` | HIGH | direct req.query reference (src/modules/tasks/task.controller.ts:58) |
| `page` | HIGH | direct req.query reference (src/modules/tasks/task.controller.ts:57) |
| `priority` | HIGH | direct req.query reference (src/modules/tasks/task.controller.ts:74) |
| `search` | HIGH | direct req.query reference (src/modules/tasks/task.controller.ts:92) |
| `sortBy` | HIGH | direct req.query reference (src/modules/tasks/task.controller.ts:59) |
| `sortOrder` | HIGH | direct req.query reference (src/modules/tasks/task.controller.ts:60) |
| `status` | HIGH | direct req.query reference (src/modules/tasks/task.controller.ts:62) |
| `toDate` | HIGH | direct req.query reference (src/modules/tasks/task.controller.ts:94) |
| `type` | HIGH | direct req.query reference (src/modules/tasks/task.controller.ts:68) |

## POST /api/v1/tasks

- Controller: `TaskController.createTask`
- Source: `src/modules/tasks/task.route.ts:43`
- Auth required: Yes
- Path params: None
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

| Field | Confidence | Source |
| --- | --- | --- |
| `assignedTo` | MEDIUM | service-layer tracing via createTask destructuring (src/modules/tasks/task.service.ts:138) |
| `description` | MEDIUM | service-layer tracing via createTask destructuring (src/modules/tasks/task.service.ts:138) |
| `priority` | MEDIUM | service-layer tracing via createTask destructuring (src/modules/tasks/task.service.ts:138) |
| `title` | MEDIUM | service-layer tracing via createTask destructuring (src/modules/tasks/task.service.ts:138) |
| `type` | MEDIUM | service-layer tracing via createTask destructuring (src/modules/tasks/task.service.ts:138) |
| `weight` | MEDIUM | service-layer tracing via createTask destructuring (src/modules/tasks/task.service.ts:138) |

### Query Parameters

None inferred.

## DELETE /api/v1/tasks/:id

- Controller: `TaskController.deleteTask`
- Source: `src/modules/tasks/task.route.ts:48`
- Auth required: Yes
- Path params: `id`
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## GET /api/v1/tasks/:id

- Controller: `TaskController.getTaskById`
- Source: `src/modules/tasks/task.route.ts:45`
- Auth required: Yes
- Path params: `id`
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## PUT /api/v1/tasks/:id

- Controller: `TaskController.updateTask`
- Source: `src/modules/tasks/task.route.ts:46`
- Auth required: Yes
- Path params: `id`
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

| Field | Confidence | Source |
| --- | --- | --- |
| `assignedTo` | MEDIUM | service-layer tracing via updateTask (src/modules/tasks/task.service.ts:238) |
| `description` | MEDIUM | service-layer tracing via updateTask (src/modules/tasks/task.service.ts:236) |
| `priority` | MEDIUM | service-layer tracing via updateTask (src/modules/tasks/task.service.ts:231) |
| `title` | MEDIUM | service-layer tracing via updateTask (src/modules/tasks/task.service.ts:232) |
| `type` | MEDIUM | service-layer tracing via updateTask (src/modules/tasks/task.service.ts:230) |
| `weight` | MEDIUM | service-layer tracing via updateTask (src/modules/tasks/task.service.ts:239) |

### Query Parameters

None inferred.

## PATCH /api/v1/tasks/:id/status

- Controller: `TaskController.updateTaskStatus`
- Source: `src/modules/tasks/task.route.ts:47`
- Auth required: Yes
- Path params: `id`
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

| Field | Confidence | Source |
| --- | --- | --- |
| `status` | MEDIUM | service-layer tracing via updateTaskStatus (src/modules/tasks/task.service.ts:264) |

### Query Parameters

None inferred.

## GET /api/v1/tasks/efficiency/hotel

- Controller: `TaskController.getHotelEfficiencyReport`
- Source: `src/modules/tasks/task.route.ts:22`
- Auth required: Yes
- Path params: None
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

| Field | Confidence | Source |
| --- | --- | --- |
| `fromDate` | HIGH | direct req.query reference (src/modules/tasks/task.controller.ts:269) |
| `toDate` | HIGH | direct req.query reference (src/modules/tasks/task.controller.ts:270) |

## GET /api/v1/tasks/efficiency/user/:userId

- Controller: `TaskController.getUserOph`
- Source: `src/modules/tasks/task.route.ts:28`
- Auth required: Yes
- Path params: `userId`
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

| Field | Confidence | Source |
| --- | --- | --- |
| `fromDate` | HIGH | direct req.query reference (src/modules/tasks/task.controller.ts:211) |
| `toDate` | HIGH | direct req.query reference (src/modules/tasks/task.controller.ts:212) |

## GET /api/v1/tasks/efficiency/user/:userId/history

- Controller: `TaskController.getUserEfficiencyHistory`
- Source: `src/modules/tasks/task.route.ts:34`
- Auth required: Yes
- Path params: `userId`
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

| Field | Confidence | Source |
| --- | --- | --- |
| `fromDate` | HIGH | direct req.query reference (src/modules/tasks/task.controller.ts:243) |
| `granularity` | HIGH | direct req.query reference (src/modules/tasks/task.controller.ts:235) |
| `toDate` | HIGH | direct req.query reference (src/modules/tasks/task.controller.ts:244) |

## GET /api/v1/tasks/summary

- Controller: `TaskController.getTaskSummary`
- Source: `src/modules/tasks/task.route.ts:19`
- Auth required: Yes
- Path params: None
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## GET /api/v1/tasks/user/:userId

- Controller: `TaskController.getTasksByAssignee`
- Source: `src/modules/tasks/task.route.ts:40`
- Auth required: Yes
- Path params: `userId`
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `authMiddleware` -> `tenantMiddleware`
- RBAC: None

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## GET /api/v1/user/admin/users

- Controller: `UserController.getUsers`
- Source: `src/modules/users/user.route.ts:19`
- Auth required: Yes
- Path params: None
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `authorizeRoles`
- RBAC: roles: `MENDADMIN`

### Request Body Fields

None inferred.

### Query Parameters

| Field | Confidence | Source |
| --- | --- | --- |
| `availability` | HIGH | direct req.query reference destructuring (src/modules/users/user.controller.ts:52) |
| `limit` | HIGH | direct req.query reference destructuring (src/modules/users/user.controller.ts:52) |
| `page` | HIGH | direct req.query reference destructuring (src/modules/users/user.controller.ts:52) |
| `profession` | HIGH | direct req.query reference destructuring (src/modules/users/user.controller.ts:52) |
| `search` | HIGH | direct req.query reference destructuring (src/modules/users/user.controller.ts:52) |
| `sortBy` | HIGH | direct req.query reference destructuring (src/modules/users/user.controller.ts:52) |
| `sortOrder` | HIGH | direct req.query reference destructuring (src/modules/users/user.controller.ts:52) |
| `status` | HIGH | direct req.query reference destructuring (src/modules/users/user.controller.ts:52) |
| `yearsOfExperience` | HIGH | direct req.query reference destructuring (src/modules/users/user.controller.ts:52) |

## POST /api/v1/user/createUser

- Controller: `UserController.createUser`
- Source: `src/modules/users/user.route.ts:12`
- Auth required: Yes
- Path params: None
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `authorizeRoles`
- RBAC: roles: `ADMIN`, `MANAGER`, `MENDADMIN`

### Request Body Fields

| Field | Confidence | Source |
| --- | --- | --- |
| `availability` | MEDIUM | service-layer tracing via createUser (src/modules/users/user.service.ts:33) |
| `departmentRole` | MEDIUM | service-layer tracing via createUser (src/modules/users/user.service.ts:39) |
| `departmentType` | MEDIUM | service-layer tracing via createUser (src/modules/users/user.service.ts:38) |
| `email` | MEDIUM | service-layer tracing via createUser (src/modules/users/user.service.ts:13) |
| `hotelId` | HIGH | direct req.body reference (src/modules/users/user.controller.ts:12) |
| `idNumber` | MEDIUM | service-layer tracing via createUser (src/modules/users/user.service.ts:36) |
| `idType` | MEDIUM | service-layer tracing via createUser (src/modules/users/user.service.ts:35) |
| `password` | MEDIUM | service-layer tracing via createUser (src/modules/users/user.service.ts:18) |
| `phone` | MEDIUM | service-layer tracing via createUser (src/modules/users/user.service.ts:30) |
| `previousVenues` | MEDIUM | service-layer tracing via createUser (src/modules/users/user.service.ts:34) |
| `profession` | MEDIUM | service-layer tracing via createUser (src/modules/users/user.service.ts:32) |
| `profile` | MEDIUM | service-layer tracing via createUser (src/modules/users/user.service.ts:29) |
| `role` | MEDIUM | service-layer tracing via createUser (src/modules/users/user.service.ts:28) |
| `whatsappNumber` | MEDIUM | service-layer tracing via createUser (src/modules/users/user.service.ts:31) |
| `yearsOfExperience` | MEDIUM | service-layer tracing via createUser (src/modules/users/user.service.ts:37) |

### Query Parameters

None inferred.

## DELETE /api/v1/user/deleteUser/:id

- Controller: `UserController.deleteUser`
- Source: `src/modules/users/user.route.ts:15`
- Auth required: Yes
- Path params: `id`
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `authorizeRoles`
- RBAC: roles: `ADMIN`, `MANAGER`, `MENDADMIN`

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## GET /api/v1/user/getUsers

- Controller: `UserController.getUsers`
- Source: `src/modules/users/user.route.ts:16`
- Auth required: Yes
- Path params: None
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `authorizeRoles`
- RBAC: roles: `ADMIN`, `MANAGER`, `MENDADMIN`

### Request Body Fields

None inferred.

### Query Parameters

| Field | Confidence | Source |
| --- | --- | --- |
| `availability` | HIGH | direct req.query reference destructuring (src/modules/users/user.controller.ts:52) |
| `limit` | HIGH | direct req.query reference destructuring (src/modules/users/user.controller.ts:52) |
| `page` | HIGH | direct req.query reference destructuring (src/modules/users/user.controller.ts:52) |
| `profession` | HIGH | direct req.query reference destructuring (src/modules/users/user.controller.ts:52) |
| `search` | HIGH | direct req.query reference destructuring (src/modules/users/user.controller.ts:52) |
| `sortBy` | HIGH | direct req.query reference destructuring (src/modules/users/user.controller.ts:52) |
| `sortOrder` | HIGH | direct req.query reference destructuring (src/modules/users/user.controller.ts:52) |
| `status` | HIGH | direct req.query reference destructuring (src/modules/users/user.controller.ts:52) |
| `yearsOfExperience` | HIGH | direct req.query reference destructuring (src/modules/users/user.controller.ts:52) |

## PATCH /api/v1/user/suspendUser/:id

- Controller: `UserController.suspendUser`
- Source: `src/modules/users/user.route.ts:14`
- Auth required: Yes
- Path params: `id`
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `authorizeRoles`
- RBAC: roles: `ADMIN`, `MANAGER`, `MENDADMIN`

### Request Body Fields

None inferred.

### Query Parameters

None inferred.

## PUT /api/v1/user/updateUser/:id

- Controller: `UserController.updateUser`
- Source: `src/modules/users/user.route.ts:13`
- Auth required: Yes
- Path params: `id`
- Middleware: `authMiddleware` -> `tenantMiddleware` -> `authorizeRoles`
- RBAC: roles: `ADMIN`, `MANAGER`, `MENDADMIN`

### Request Body Fields

| Field | Confidence | Source |
| --- | --- | --- |
| `password` | MEDIUM | service-layer tracing via updateUser (src/modules/users/user.service.ts:51) |
| `passwordHash` | MEDIUM | service-layer tracing via updateUser (src/modules/users/user.service.ts:52) |

### Query Parameters

None inferred.


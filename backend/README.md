# Mend Backend

## Overview

Mend is a multi-tenant SaaS platform designed to improve workforce efficiency, ensure ethical recruitment, enforce compliance standards, and provide learning and certification infrastructure for the hospitality industry.

Core capabilities include:

- Workforce attendance tracking with geofencing
- 10:14 Human Efficiency Standard enforcement
- Fatigue and wellbeing monitoring
- SOS and safety alert system
- Certification and compliance engine
- Recruitment marketplace
- Learning Management System (LMS)
- Mend Passport (professional identity profile)
- Role-based dashboards and analytics

This backend is built using:

- Modular Layered Architecture
- MongoDB (NoSQL database)
- Node.js with TypeScript
- Express.js framework

This architecture is optimized for MVP speed, maintainability, and future scalability.

---

# Architecture Overview

The backend follows Modular Layered Architecture.

This combines:

- Layered Architecture (Controller → Service → Repository)
- Module-based organization by business domain

Instead of grouping code by technical layers globally, we group by domain modules.

This ensures:

- Clear separation of business logic
- Easier maintenance
- Faster development
- Future-ready scalability

---

# Core Architectural Principles

## 1. Separation of Concerns

Each layer has a specific responsibility:

Controller Layer  
Handles HTTP requests and responses.

Service Layer  
Contains business logic and rule enforcement.

Repository Layer  
Handles database communication.

Model Layer  
Defines MongoDB schema using Mongoose.

---

## 2. Domain-Based Modular Design

Each business domain has its own module.

Examples:

- Auth
- Users
- Attendance
- Wellbeing
- SOS
- Tasks
- Certification
- Recruitment
- Passport
- LMS
- Analytics

This ensures isolation between domains.

---

## 3. Multi-Tenant SaaS Architecture

Mend supports multiple hotels (tenants).

Each database record contains:

```
hotelId
```

This ensures complete data isolation between hotels.

---

# Technology Stack

Core:

- Node.js
- TypeScript
- Express.js

Database:

- MongoDB
- Mongoose ODM

Security:

- JWT authentication
- Bcrypt password hashing

Infrastructure:

- Firebase Admin SDK (push notifications)
- Redis (optional caching and rate limiting)

Validation:

- Zod or custom validation

---

# Project Structure

```
src/

  config/
  core/
  shared/

  modules/

    auth/
    users/
    attendance/
    wellbeing/
    sos/
    tasks/
    certification/
    recruitment/
    passport/
    lms/
    analytics/

  server.ts
```

---

# Folder Explanation

## config/

Contains system configuration:

- Database connection
- Environment variables
- Firebase setup

Example:

```
config/
  database.ts
  env.ts
```

---

## core/

Contains global infrastructure logic:

- Authentication middleware
- Tenant middleware
- Error handling middleware
- Logger
- Base utilities

Example:

```
core/
  middleware/
  utils/
```

---

## shared/

Reusable components:

- Enums
- Constants
- Interfaces
- Utility functions

---

## modules/

Each folder represents a business domain.

Example:

```
modules/
  attendance/
```

---

# Module Structure

Example: attendance module

```
attendance/

  attendance.controller.ts
  attendance.service.ts
  attendance.repository.ts
  attendance.model.ts
  attendance.routes.ts
```

---

# Layer Responsibilities

## Controller Layer

Responsible for:

- Handling HTTP requests
- Calling service layer
- Returning response

Controllers do NOT contain business logic.

Example:

```
POST /attendance/clock-in
```

---

## Service Layer

Responsible for:

- Business logic
- Rule enforcement
- System workflows

Examples:

- Enforcing 10-hour max work rule
- Enforcing 14-hour recovery rule
- Calculating fatigue risk
- Compliance scoring

This is the core brain of the application.

---

## Repository Layer

Responsible for:

- Database interaction
- Query execution
- Data persistence

Contains MongoDB queries using Mongoose.

No business logic exists here.

---

## Model Layer

Defines MongoDB schema.

Example:

```
Attendance Schema
User Schema
Job Schema
Certification Schema
```

---

# Request Flow Example

Clock-in flow:

```
Client
  ↓
Route
  ↓
Controller
  ↓
Service (business logic)
  ↓
Repository
  ↓
MongoDB
```

---

# MongoDB Database Design

MongoDB stores data as documents.

Example Attendance document:

```
{
  "_id": "attendance123",
  "hotelId": "hotel123",
  "userId": "user123",
  "clockIn": "2026-02-22T10:00:00Z",
  "clockOut": "2026-02-22T18:00:00Z"
}
```

---

# MongoDB Collections

Main collections include:

```
tenants
users
attendance
wellbeing
tasks
certifications
jobs
applications
passportProfiles
courses
sosEvents
auditLogs
```

---

# Multi-Tenant Isolation

Each document contains:

```
hotelId
```

Every query must filter using hotelId.

Example:

```
Attendance.find({ hotelId })
```

This ensures hotel data isolation.

---

# Indexing Strategy

Indexes improve performance.

Examples:

```
hotelId
userId
createdAt
clockIn
```

---

# Authentication Architecture

Uses JWT-based authentication.

Flow:

```
Login
  ↓
JWT issued
  ↓
JWT sent in requests
  ↓
Middleware validates JWT
  ↓
User authenticated
```

---

# Security Features

- JWT authentication
- Password hashing with bcrypt
- Tenant isolation
- Role-based access control
- Secure middleware handling

---

# Why MongoDB Was Chosen

MongoDB provides:

- Flexible schema
- Faster MVP development
- Horizontal scalability
- Better handling of nested data
- No migration overhead

Ideal for evolving SaaS systems like Mend.

---

# Advantages of Modular Layered Architecture

- Easy to understand
- Faster development
- Clear domain separation
- Easy debugging
- Production-ready for MVP
- Easy transition to microservices later

---

# Limitations

- Services may grow large if unmanaged
- Less strict domain isolation than full DDD
- Requires discipline in service layer

---

# Future Scalability Plan

Current Stage:

Modular Monolith

Future Stage:

Split modules into microservices:

```
auth-service
attendance-service
recruitment-service
certification-service
lms-service
analytics-service
```

Architecture already supports this transition.

---

# Development Workflow

Typical feature development flow:

1. Create module
2. Create model
3. Create repository
4. Create service
5. Create controller
6. Create routes
7. Register routes in server

---

# Summary

Mend backend uses:

- Modular Layered Architecture
- MongoDB NoSQL database
- Node.js and TypeScript
- Express.js framework

This architecture ensures:

- Fast MVP development
- Clean code organization
- Multi-tenant isolation
- Business rule enforcement
- Future scalability

---

# Final Note

Mend is a rule-driven SaaS platform, not a simple CRUD application.

This architecture ensures long-term scalability, maintainability, and production readiness while allowing fast MVP delivery.
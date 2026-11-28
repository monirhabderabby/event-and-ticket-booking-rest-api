# Task 1: Foundation, Schema Alignment, Auth Hardening, User Profile & Welcome Email

## Objective & Scope
Establish the core engineering foundation (standard response helpers, centralized error handling, Zod validation middleware, RBAC guards), update `prisma/schema.prisma` minimally to support event discovery and ticket booking while preserving all existing models/fields and the `user`/`admin` role system, refactor Module A (`/api/auth/register`, `/api/auth/login`, `/api/users/me`), and integrate Resend to send a non-blocking **Welcome Email** upon user registration.

---

## Specific Files to Create / Update
- `package.json` — Install `zod`, `resend`, `express-rate-limit`, and `@types/bcryptjs` (if needed); add `"build": "tsc"` script.
- `.env.example` & `src/config/env.ts` — Add `RESEND_API_KEY` and `RESEND_FROM_EMAIL` (default `onboarding@resend.dev`); validate required environment variables on startup.
- `prisma/schema.prisma` — Keep existing models (`User`, `Event`, `Booking`, `Guest`, `Coupon`, `Payment`) and fields intact; add `User.events`, `Event.category`, `Event.availableSeats`, `Event.organizerId`/`organizer` (and `Float?` for `Event.price` if fractional prices are needed, or numeric compatibility), `Booking.seatsBooked`, `Booking.totalPrice`; regenerate client & push to MongoDB.
- `src/utils/ApiError.ts` *(create)* — Operational error class supporting custom HTTP status codes (`400`, `401`, `403`, `404`, `409`).
- `src/utils/apiResponse.ts` *(create)* — Standardized JSON response helper (`{ success, message, data, meta }`).
- `src/middleware/error.middleware.ts` *(create)* — Global error handler mapping `ApiError`, `ZodError`, JWT errors, and Prisma errors (`P2002`, `P2023`, `P2025`) to clean HTTP status codes.
- `src/middleware/validate.middleware.ts` *(create)* — Reusable Zod validation middleware for `body`, `query`, and `params`.
- `src/middleware/auth.middleware.ts` *(update)* — Fix `CustomJwtPayload` (`userId` typing), standardize `401`/`403` JSON envelopes (`{ success: false, message }`), and implement higher-order `restrictTo(...roles)` RBAC guard.
- `src/config/resend.ts` *(create)* & `src/services/email.service.ts` *(create)* — Initialize Resend client and implement non-blocking `sendWelcomeEmail`.
- `src/modules/auth/auth.validation.ts` *(create)* — Zod schemas for registration and login.
- `src/modules/auth/auth.controller.ts` *(update)* — Refactor `register` (strictly `user` role default, no self-assigned `admin`, Zod validated, non-blocking Resend welcome email) and `login` (fix `user.status !== "active"` bug, return `401` on bad credentials, standard response envelope).
- `src/modules/user/user.validation.ts`, `src/modules/user/user.controller.ts`, `src/routes/user.routes.ts` *(create)* — Implement `GET /api/users/me` and `PUT /api/users/me` (`firstName`, `lastName`, `email`, `phone`, `designation`).
- `src/routes/auth.routes.ts` & `src/app.ts` *(update)* — Remove `GET /api/auth/me`, mount `/api/users`, attach global `errorHandler`.

---

## Detailed Checklist of Requirements & Edge Cases
- [ ] **Dependencies & Build:** Install `zod`, `resend`, `express-rate-limit`; add `"build": "tsc"` and verify `npx tsc --noEmit`.
- [ ] **Prisma Schema:** Preserve all existing models/fields (`firstName`, `lastName`, `phone`, `status`, `Role: user | admin`, `Guest`, `Coupon`, `Payment`, `BookingStatus: pending | canceled | booked`); add only `Event.category`, `Event.availableSeats`, `Event.organizerId`/`organizer`, `Booking.seatsBooked`, `Booking.totalPrice`; run `npx prisma generate` and `npx prisma db push`.
- [ ] **Registration (`POST /api/auth/register`):**
  - Validate `firstName`, `lastName`, `email` (trimmed, lowercased), `password` (min 6 chars), `phone`, and optional `designation` via Zod.
  - Always assign `role: "user"` (ignore/reject any attempt to pass `admin` role).
  - Check duplicate `email` or `phone` (`409 Conflict` / `400 Bad Request`).
  - Hash password with `bcryptjs` (salt rounds `10`) and exclude `password` from JSON response (`201 Created`).
  - Trigger non-blocking Resend **Welcome Email** (log any error without failing the response).
- [ ] **Login (`POST /api/auth/login`):**
  - Validate `email` and `password` with Zod.
  - Return `401 Unauthorized` when email is not found or password mismatches.
  - Fix the status check bug: reject with `403 Forbidden` if `user.status !== "active"`.
  - Sign JWT `{ userId, role }` and return `200 OK` with `{ success: true, message, data: { user, token } }` (password excluded).
- [ ] **Auth & Role Guards:**
  - `verifyAuth`: Decode Bearer token, verify user exists & `status === "active"`, attach `req.user = { id, role }`.
  - `restrictTo(...roles)`: Return `403 Forbidden` if `!req.user` or `!roles.includes(req.user.role)`.
- [ ] **Profile Management (`GET /api/users/me`, `PUT /api/users/me`):**
  - `GET /api/users/me`: Return authenticated user profile (`200 OK`, exclude `password`).
  - `PUT /api/users/me`: Validate updatable fields (`firstName`, `lastName`, `email`, `phone`, `designation`) with Zod; check uniqueness if `email` or `phone` changes against other users (`id !== req.user.id`); disallow changing `role` or `status`; return updated profile without `password`.

---

## Acceptance Criteria
1. All auth and user endpoints use Zod middleware and return `{ success, message, data, meta? }`.
2. `POST /api/auth/register` always creates a `user` account, excludes `password`, and triggers a non-blocking Welcome Email via Resend.
3. `POST /api/auth/login` checks `user.status === "active"`, returns `401` on invalid credentials, and issues a JWT containing `userId` and `role`.
4. `verifyAuth` and `restrictTo("admin")` protect endpoints with `401` and `403`.
5. `GET /api/users/me` and `PUT /api/users/me` work cleanly, and legacy `GET /api/auth/me` is removed.

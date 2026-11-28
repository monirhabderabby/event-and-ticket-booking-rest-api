# Engineering Notes & Project Audit Log

**Project:** Event & Ticket Booking REST API  
**Stack:** Node.js, Express.js v5, TypeScript (`strict: true`, ESM `NodeNext`), Prisma ORM v6, MongoDB, Zod, JWT, bcryptjs, Resend  
**Last Updated:** 2026-11-28

---

## 1. Current Codebase Audit & Confirmed Architecture

### Confirmed Decisions
- **Roles (`Role` enum):** `user` (default) and `admin`. `admin` acts as the platform owner/event organizer (`restrictTo("admin")` guards `POST /api/events`, `PATCH /api/events/:id`, and `DELETE /api/events/:id`). Public registration always assigns `user`.
- **Existing Prisma Schema Preserved:** Keep `User` (`firstName`, `lastName`, `phone`, `status`, `role`, `designation`, `emailVerfication`), `Event` (`name`, `shortDescription`, `startTime`, `endTime`, `description`, `status`, `location`, `price`, `seat`, `banner`), `Booking` (`status: pending | canceled | booked`), `Guest`, `Coupon`, and `Payment` intact.
  - **Minimal Schema Additions:**
    - `User`: `events Event[]` relation.
    - `Event`: `category String?`, `availableSeats Int?`, `organizerId String? @db.ObjectId`, `organizer User? @relation(...)`. Note field mapping to PDF terminology: `name` = event title, `startTime` = event date/start time, `seat` = total seats.
    - `Booking`: `seatsBooked Int @default(1)`, `totalPrice Float @default(0)`. Active confirmed booking status = `booked`; cancelled = `canceled`.
- **Profile Routes:** Strictly `GET /api/users/me` and `PUT /api/users/me` (legacy `GET /api/auth/me` removed).
- **Folder Layout:** Hybrid modular layout (`src/modules/<domain>/`, `src/routes/`, `src/middleware/`, `src/services/`, `src/utils/`, `src/config/`).

### Bugs & Gaps Identified in Initial Starter Code (To Fix in Task 1)
1. **Missing Packages:** Install `zod`, `resend`, `express-rate-limit` (plus `@types/bcryptjs` if needed), and add `"build": "tsc"` in `package.json`.
2. **`auth.controller.ts` (`login`):**
   - Bug: `const isActive = user.status; if (!isActive)` is always `false` because `"inactive"`/`"suspended"` are non-empty truthy strings. Fix to `if (user.status !== "active")`.
   - Returns `400` on invalid credentials instead of `401 Unauthorized`; missing `message` in `200` response.
3. **`auth.controller.ts` (`register`):**
   - Uses manual checks instead of Zod; has typo `"Email of Phone already registered"`; does not trigger Resend welcome email.
4. **`auth.middleware.ts` (`verifyAuth`):**
   - `CustomJwtPayload` types `id: string` instead of `userId: string`; error responses omit `success: false`; `restrictTo(...roles)` is missing.
5. **`auth.routes.ts` & `app.ts`:**
   - Remove `GET /api/auth/me`; mount `/api/users` for `GET`/`PUT /api/users/me`; add centralized `errorHandler`.

---

## 2. Agreed Engineering & Coding Standards

### Module & Import Conventions
- `package.json` uses `"type": "module"` and `tsconfig.json` uses `"module": "NodeNext"` + `"moduleResolution": "NodeNext"` + `"strict": true`.
- **All relative TypeScript imports must use `.js` extensions** (e.g., `import { prisma } from "../../config/prisma.js";`).

### Standardized JSON Response Envelope
```json
{
  "success": true,
  "message": "Human-readable status message",
  "data": null,
  "meta": {}
}
```
- Error responses use `success: false` and accurate HTTP status codes (`400`, `401`, `403`, `404`, `409`, `429`, `500`).
- Validate `req.body`, `req.query`, and `req.params` (24-char hex MongoDB ObjectIds) using Zod middleware.
- Forward errors via `next(error)` to centralized `errorHandler`. Never expose `password` or production stack traces.

---

## 3. Resend Transactional Email Trigger Points

- Config: `RESEND_API_KEY` (from `.env`) and `RESEND_FROM_EMAIL` (default `onboarding@resend.dev` in `.env.example`).
- **All email dispatches are non-blocking:** Commit DB state first, wrap Resend calls in `try/catch`, and log errors without failing the HTTP response.

| Trigger Point | Endpoint | Email Type | Key Payload Details |
| --- | --- | --- | --- |
| User Registration | `POST /api/auth/register` | **Welcome Email** | Recipient full name (`firstName` `lastName`), `email` |
| Ticket Booking | `POST /api/bookings` | **Booking Confirmation** | Booking ID, event `name`, `startTime`, `location`, `seatsBooked`, `totalPrice` |
| Booking Cancellation | `PATCH /api/bookings/:id/cancel` | **Booking Cancellation** | Booking ID, event `name`, restored `seatsBooked` |

---

## 4. Progress Tracker
- [x] Initial repo & specification PDF audit
- [x] Ambiguities resolved in `project-docs/question.md`
- [x] Docs & 5 delivery tasks synced with `user`/`admin` design
- [x] Task 1: Auth, Schema Alignment, Users & Welcome Email
- [x] Task 2: Event Management & Ownership
- [x] Task 3: Public Event Discovery
- [x] Task 4: Ticket Booking & Resend Emails
- [x] Task 5: Hardening & Postman Collection (code complete; live-DB E2E pending, see section 5)

---

## 5. Final Verification Results (2026-11-28)

**Verified (no database required):**
- `npx tsc --noEmit` and `npm run build`: 0 errors under `strict: true`.
- `/health` returns 200; unknown routes return 404 in the standard envelope.
- Validation returns 400: `minPrice < 0`, `minPrice > maxPrice`, `page=0`, unsupported `sortBy`, `limit > 100`, malformed ObjectId, invalid register body.
- Missing token returns 401 on all protected routes (events POST/PATCH/DELETE, bookings, users/me).
- Auth rate limiter (20 requests / 15 min per IP on `/api/auth`) returns 429 `{ success: false, message }`.

**Not yet verified (needs live MongoDB replica set + Resend key):**
- Happy paths and 403/404 cases for endpoints 1-12, seat decrement/restore inside `$transaction`, and delivery of the three Resend emails. Use `postman/event-booking-api.postman_collection.json`.

**Decisions:** newly created events default to `published`; public list/detail show only `published`; booking a draft returns 400; deleting an event also removes its payments, bookings, coupons and guests.

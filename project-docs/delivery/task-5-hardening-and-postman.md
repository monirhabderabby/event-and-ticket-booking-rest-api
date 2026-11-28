# Task 5: API Hardening, Verification & Postman Collection (Module E & Deliverables)

## Objective & Scope
Complete production security hardening (rate limiting on auth endpoints, ObjectId & payload validation audit across all routes), verify strict TypeScript compilation and runtime behavior across all 12 endpoints, finalize documentation, and export an organized Postman Collection.

---

## Specific Files to Create / Update
- `src/middleware/rateLimit.middleware.ts` *(create)* — Configure `express-rate-limit` for `/api/auth/register` and `/api/auth/login` returning standardized JSON `{ success: false, message }` on `429`.
- `src/app.ts` *(update)* — Verify `helmet()`, `cors()`, auth rate limiter, 404 handler envelope, and centralized error handler.
- `.env.example` *(update)* — Verify all keys (`PORT`, `NODE_ENV`, `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL=onboarding@resend.dev`) are cleanly documented.
- `package.json` *(update)* — Verify `"build": "tsc"` and `"start": "node dist/server.js"` succeed.
- `postman/event-booking-api.postman_collection.json` *(create)* — Organized Postman Collection covering all endpoints, example payloads, query params, and collection variables (`baseUrl`, `token`, `adminToken`, `eventId`, `bookingId`).
- `readme.md` & `project-docs/notes.md` *(update)* — Record final verification results.

---

## Detailed Checklist of Requirements & Edge Cases
- [ ] **Security Middleware:**
  - `helmet()` active for HTTP security headers.
  - `cors()` configured cleanly.
  - `express-rate-limit` active on `/api/auth` routes returning `429 Too Many Requests` in standard JSON format.
- [ ] **Validation & Error Status Audit:**
  - Every `req.body`, `req.query`, and `:id` `req.params` validated via Zod middleware.
  - Negative prices, zero/negative seat counts, past event timestamps, and malformed ObjectIds return `400 Bad Request`.
  - Unauthenticated requests return `401 Unauthorized`; non-admin or non-owner requests return `403 Forbidden`; missing resources return `404 Not Found`.
  - Standardized `{ success, message, data, meta }` envelope verified across all endpoints.
- [ ] **TypeScript & Build Verification:**
  - `npx tsc --noEmit` and `npm run build` succeed with 0 errors under `strict: true`.
  - `node dist/server.js` boots cleanly and `/health` responds `200 OK`.
- [ ] **End-to-End Endpoint & Resend Verification:**
  - Verify all 12 specification endpoints + `/health` against live MongoDB:
    1. `POST /api/auth/register` (always `user` role + non-blocking Resend Welcome Email)
    2. `POST /api/auth/login` (active status check + JWT)
    3. `GET /api/users/me`
    4. `PUT /api/users/me`
    5. `POST /api/events` (`admin` succeeds, `user` gets `403`)
    6. `GET /api/events` (category, `name`/`location` partial search, `minPrice`/`maxPrice`, sort, pagination `meta`)
    7. `GET /api/events/:id` (includes organizer details)
    8. `PATCH /api/events/:id` (owner `admin` succeeds, other `admin` gets `403`, past-event & seat recalculation guards)
    9. `DELETE /api/events/:id` (owner `admin` succeeds, blocked with `400` if `booked` bookings exist)
    10. `POST /api/bookings` (atomic seat decrement, server-computed `totalPrice`, non-blocking Resend confirmation email)
    11. `GET /api/bookings/my-tickets` (populated event info)
    12. `PATCH /api/bookings/:id/cancel` (restores `availableSeats`, prevents double-cancel, non-blocking Resend cancellation email)
- [ ] **Postman Collection:**
  - Export v2.1 Postman Collection organized into folders (`System`, `Auth`, `Users`, `Events`, `Bookings`) with login test scripts that save tokens automatically.

---

## Acceptance Criteria
1. `npm run build` passes cleanly with zero TypeScript errors.
2. Auth rate limiting triggers `429` after exceeding configured threshold.
3. All 12 specification endpoints + `/health` pass happy-path and negative/edge-case verification (`400`, `401`, `403`, `404`).
4. Resend welcome, booking confirmation, and cancellation email integrations are verified and confirmed non-blocking.
5. Postman Collection JSON is committed in the repository and ready for submission.

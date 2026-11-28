# Task 2: Event Management & Admin Ownership Rules (Module B)

## Objective & Scope
Implement event creation, partial updates, and deletion restricted strictly to `admin` users (`restrictTo("admin")`) with creator ownership verification, seat recalculation safeguards, past-event protections, and active booking deletion guards.

---

## Specific Files to Create / Update
- `src/modules/event/event.validation.ts` *(create)* — Zod schemas for `createEventSchema`, `updateEventSchema`, and `eventIdParamSchema` (24-char MongoDB ObjectId validation).
- `src/modules/event/event.controller.ts` *(create)* — Implement `createEvent`, `updateEvent`, and `deleteEvent`.
- `src/routes/event.routes.ts` *(create)* — Define `POST /`, `PATCH /:id`, and `DELETE /:id` protected by `verifyAuth`, `restrictTo("admin")`, and Zod validation middleware.
- `src/app.ts` *(update)* — Mount `/api/events` -> `eventRoutes`.

---

## Detailed Checklist of Requirements & Edge Cases
- [ ] **Create Event (`POST /api/events`):**
  - Guarded by `verifyAuth` and `restrictTo("admin")` (`401` unauthenticated, `403` for `user` role).
  - Validate `name`, `shortDescription`, optional `description`, `category`, `location`, `startTime` (valid future ISO date), optional `endTime` (must be after `startTime` if provided), `price` (`>= 0`), `seat` (positive integer `>= 1`), optional `status` (`draft` | `published`), optional `banner`.
  - Initialize `availableSeats = seat` automatically and bind `organizerId = req.user!.id`.
  - Return `201 Created` with standardized JSON response.
- [ ] **Update Event (`PATCH /api/events/:id`):**
  - Guarded by `verifyAuth` and `restrictTo("admin")`.
  - Validate `:id` ObjectId (`400` if malformed) and check existence (`404` if missing).
  - Enforce creator ownership: if `event.organizerId !== req.user!.id`, return `403 Forbidden`.
  - **Past-Event Guard:** Reject with `400 Bad Request` if the event's existing `startTime` has already passed (`event.startTime <= new Date()`), or if an updated `startTime`/`endTime` is set in the past (or `endTime <= startTime`).
  - **Seat Capacity Recalculation:** If `seat` (total seats) is updated, calculate `alreadyBookedSeats` (from `event.seat - event.availableSeats` or sum of `booked` bookings' `seatsBooked`). Reject with `400 Bad Request` if `newSeat < alreadyBookedSeats`; otherwise set `availableSeats = newSeat - alreadyBookedSeats`.
  - Return `200 OK` with updated event.
- [ ] **Delete Event (`DELETE /api/events/:id`):**
  - Guarded by `verifyAuth` and `restrictTo("admin")`.
  - Validate `:id` ObjectId (`400`) and existence (`404`).
  - Enforce ownership (`event.organizerId === req.user!.id`, else `403 Forbidden`).
  - **Active Booking Guard (Option A):** Check if any `Booking` on this event has `status === "booked"`. If count > 0, reject with `400 Bad Request` (`"Cannot delete an event with active confirmed bookings"`). Allow deletion only if there are zero bookings or all existing bookings have `status === "canceled"` (cleaning up any `canceled` booking records if needed to keep DB consistent).
  - Return `200 OK` confirming deletion.

---

## Acceptance Criteria
1. Non-admin (`user`) accounts receive `403 Forbidden` on `POST`, `PATCH`, and `DELETE /api/events`.
2. An `admin` attempting to `PATCH` or `DELETE` an event created by another `admin` receives `403 Forbidden`.
3. Creating an event initializes `availableSeats = seat` and binds `organizerId` from `req.user.id`.
4. Updating `seat` accurately recalculates `availableSeats` and rejects reductions below already-booked seats with `400`; past-event edits or past timestamps return `400`.
5. Deleting an event with any `booked` reservation returns `400 Bad Request`.

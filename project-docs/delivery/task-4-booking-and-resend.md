# Task 4: Ticket Booking, Atomic Seat Inventory & Resend Transactional Emails (Module D)

## Objective & Scope
Build the ticket booking and cancellation engine for authenticated users (`user` and `admin`) using existing `BookingStatus` (`booked` for confirmed reservations, `canceled` for cancellations), atomic seat inventory updates inside Prisma transactions, ticket history retrieval, and non-blocking **Resend** transactional emails.

---

## Specific Files to Create / Update
- `src/modules/booking/booking.validation.ts` *(create)* — Zod schemas for `createBookingSchema` (`eventId` ObjectId, `seatsBooked` positive int) and `bookingIdParamSchema` (`id` ObjectId).
- `src/modules/booking/booking.controller.ts` *(create)* — Implement `createBooking`, `getMyTickets`, and `cancelBooking`.
- `src/routes/booking.routes.ts` *(create)* — Register `POST /`, `GET /my-tickets`, and `PATCH /:id/cancel` protected by `verifyAuth` and Zod validation.
- `src/services/email.service.ts` *(update)* — Add non-blocking `sendBookingConfirmationEmail` and `sendBookingCancellationEmail` using Resend.
- `src/app.ts` *(update)* — Mount `/api/bookings` -> `bookingRoutes`.

---

## Detailed Checklist of Requirements & Edge Cases
- [ ] **Book Tickets (`POST /api/bookings`):**
  - Protected by `verifyAuth` (accessible to any authenticated `user` or `admin`).
  - Validate `eventId` (24-char ObjectId) and `seatsBooked` (integer `>= 1`; reject `<= 0` or non-integer with `400`).
  - Fetch event (`404` if not found).
  - Validate that `event.startTime` exists and has **not passed** (`event.startTime > new Date()`, else `400 Bad Request`).
  - Validate `event.availableSeats !== null && event.availableSeats >= seatsBooked` (`400 Bad Request` if insufficient seats).
  - **Atomic Seat Decrement:** Inside `prisma.$transaction`, execute an atomic conditional update on `Event` (`where: { id: eventId, availableSeats: { gte: seatsBooked } }`, `data: { availableSeats: { decrement: seatsBooked } }`, verifying `count === 1`) before creating the `Booking` record so concurrent requests cannot oversell seats.
  - Dynamically calculate `totalPrice = (event.price ?? 0) * seatsBooked` server-side.
  - Create `Booking` with `status: "booked"`, `userId: req.user!.id`, `eventId`, `seatsBooked`, and `totalPrice`. Multiple separate bookings by the same user for the same event are allowed up to `availableSeats`.
  - Trigger non-blocking Resend **Booking Confirmation Email** (log any error without failing the `201` response).
- [ ] **My Tickets (`GET /api/bookings/my-tickets`):**
  - Protected by `verifyAuth`.
  - Mount `/my-tickets` before parameterized `/:id` routes in `booking.routes.ts`.
  - Query all bookings for `req.user!.id`, ordered by `createdAt` descending, populated with `event: { select: { id: true, name: true, startTime: true, location: true, price: true } }`.
  - Return `200 OK` with standardized response envelope.
- [ ] **Cancel Booking (`PATCH /api/bookings/:id/cancel`):**
  - Protected by `verifyAuth`.
  - Validate `:id` ObjectId (`400`).
  - Fetch booking (with event & user details); return `404` if not found.
  - Enforce ownership: if `booking.userId !== req.user!.id`, return `403 Forbidden`.
  - Prevent double cancellation: if `booking.status !== "booked"`, return `400 Bad Request` (`"Booking is already canceled or not active"`).
  - Execute inside `prisma.$transaction`: conditionally update `Booking` (`where: { id, status: "booked" }`, `data: { status: "canceled" }`, verifying `count === 1`) and atomically increment `Event.availableSeats` by `booking.seatsBooked`.
  - Trigger non-blocking Resend **Booking Cancellation Email** (log any error without failing the `200` response).
  - Return `200 OK` with updated booking.

---

## Acceptance Criteria
1. Booking rejects past events, `seatsBooked <= 0`, malformed `eventId`, and insufficient `availableSeats` with `400` (`404` if event doesn't exist).
2. Concurrent booking attempts cannot drive `availableSeats` negative due to conditional atomic updates in `$transaction`.
3. `totalPrice` is computed strictly server-side; multiple bookings per user for the same event succeed while seats remain.
4. `GET /api/bookings/my-tickets` returns only the logged-in user's bookings with event `name`, `startTime`, and `location`.
5. `PATCH /api/bookings/:id/cancel` verifies booking ownership (`403`), prevents double cancellation (`400`), restores `availableSeats`, and dispatches a non-blocking Resend cancellation email.

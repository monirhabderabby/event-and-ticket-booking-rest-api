# Open Questions & Final Decisions

All ambiguities identified during the initial audit have been reviewed and resolved. These decisions govern Tasks 1–5.

---

### 1. Database Schema Alignment (`prisma/schema.prisma`)
- **Decision:** Keep the existing `prisma/schema.prisma` structure, models (`User`, `Event`, `Booking`, `Guest`, `Coupon`, `Payment`), and field conventions (`firstName`, `lastName`, `phone`, `status`, `designation`, `emailVerfication`, `name`, `shortDescription`, `startTime`, `endTime`, `seat`, `BookingStatus: pending | canceled | booked`, etc.) intact.
- **Roles:** Only `user` and `admin` exist (`Role` enum, default `user`). `admin` acts as the platform owner/event organizer—all organizer-level endpoints (`POST/PATCH/DELETE /api/events`) are restricted to `admin` via `restrictTo("admin")`.
- **Minimal Additions Allowed:** Add only missing fields strictly needed for assignment features without removing or breaking existing fields:
  - On `User`: `events Event[]` relation.
  - On `Event`: `category`, `availableSeats`, `organizerId` + `organizer` relation (`seat` represents total seats, `name` represents event title, `startTime` represents event date/start time).
  - On `Booking`: `seatsBooked`, `totalPrice`.

---

### 2. Auth & Profile Endpoint Paths (`/api/auth/me` vs. `/api/users/me`)
- **Decision:** Move profile endpoints strictly to `GET /api/users/me` and `PUT /api/users/me`, and remove `GET /api/auth/me` from `auth.routes.ts`.
- **Updatable Fields (`PUT /api/users/me`):** Allow authenticated users to update personal profile details (`firstName`, `lastName`, `email`, `phone`, `designation`) with Zod validation and uniqueness checks on `email` and `phone` (never allowing self-escalation of `role` or `status`).

---

### 3. Role Selection at Registration (`POST /api/auth/register`)
- **Decision:** Keep registration defaulting strictly to `user` (`Role.user`). Public registration must **not** allow clients to self-assign `admin`.

---

### 4. Event Deletion Rule When Bookings Exist (`DELETE /api/events/:id`)
- **Decision (Option A):** Reject deletion with `400 Bad Request` if any active/confirmed (`booked`) bookings exist for the event. Allow deletion only when there are zero bookings or all existing bookings have status `canceled`.

---

### 5. Event Update Edge Cases (`PATCH /api/events/:id`)
- **Decision:**
  - When updating total seats (`seat`), recalculate `availableSeats = newTotalSeats - alreadyBookedSeats` and reject with `400 Bad Request` if `newTotalSeats < alreadyBookedSeats`.
  - Block updating an event's `startTime` (or `endTime`) to a past timestamp, and block modifying an event whose `startTime` has already passed (`400 Bad Request`).

---

### 6. Booking Business Rules (`POST /api/bookings`)
- **Decision:** Any authenticated user (`user` or `admin`) can book tickets for valid upcoming events as long as `availableSeats >= seatsBooked`. Multiple separate bookings by the same user for the same event are allowed up to `availableSeats`.

---

### 7. Folder Structure Convention
- **Decision:** Keep the existing hybrid modular structure: `src/modules/<domain>/` (controllers + Zod validation schemas), `src/routes/`, `src/middleware/`, `src/services/`, `src/utils/`, and `src/config/`.

---

### 8. Resend Sender Domain & Failure Handling
- **Decision:**
  - Default `RESEND_FROM_EMAIL` in `.env.example` to `onboarding@resend.dev` (`RESEND_API_KEY` provided in `.env`).
  - All Resend email triggers (welcome email, booking confirmation, booking cancellation) must be **non-blocking**: log any email dispatch failure without failing the HTTP response after DB state is saved.

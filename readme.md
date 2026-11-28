# Event & Ticket Booking REST API

A production-grade RESTful backend for an **Event & Ticket Booking Platform** built with **Node.js**, **Express.js**, **TypeScript**, **Prisma ORM**, **MongoDB**, **Zod**, **JWT**, **bcryptjs**, and **Resend**.

Platform administrators (`admin`) publish and manage live events (concerts, workshops, tech conferences), while registered users (`user` / `admin`) discover events, reserve tickets with atomic seat inventory tracking, manage bookings, and receive transactional emails via **Resend**.

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| **Runtime & Language** | Node.js, TypeScript (`strict: true`, ESM `NodeNext`) |
| **Web Framework** | Express.js v5 |
| **Database & ORM** | MongoDB + Prisma ORM (`@prisma/client`) |
| **Authentication & RBAC** | JSON Web Tokens (`jsonwebtoken`) + `bcryptjs` (`user` & `admin` roles) |
| **Validation** | Zod (request body, query, and MongoDB ObjectId param validation) |
| **Transactional Email** | Resend (Welcome, Booking Confirmation, and Cancellation emails) |
| **Security & Middleware** | `helmet`, `cors`, `morgan`, `express-rate-limit` |

---

## Folder Architecture

The codebase follows a hybrid modular TypeScript architecture:

```text
event-and-ticket-booking-rest-api/
├── prisma/
│   └── schema.prisma                  # MongoDB collections & Prisma Client generator
├── project-docs/
│   ├── delivery/                      # Sequential implementation task breakdowns (Tasks 1–5)
│   ├── notes.md                       # Engineering audit, conventions, and scratchpad
│   └── question.md                    # Resolved business-logic & schema decisions
├── src/
│   ├── config/
│   │   ├── env.ts                     # Typed environment variable configuration
│   │   ├── prisma.ts                  # Prisma Client singleton
│   │   └── resend.ts                  # Resend client initialization
│   ├── middleware/
│   │   ├── auth.middleware.ts         # verifyAuth & restrictTo(...roles) RBAC guards
│   │   ├── validate.middleware.ts     # Zod request validation middleware
│   │   ├── error.middleware.ts        # Centralized error & ApiError handler
│   │   └── rateLimit.middleware.ts    # Rate limiting for auth endpoints
│   ├── modules/
│   │   ├── auth/                      # Auth controllers & Zod schemas
│   │   ├── user/                      # Profile management (/api/users/me)
│   │   ├── event/                     # Event CRUD & public discovery
│   │   └── booking/                   # Ticket booking, cancellation & seat inventory
│   ├── routes/
│   │   ├── auth.routes.ts             # /api/auth routes
│   │   ├── user.routes.ts             # /api/users routes
│   │   ├── event.routes.ts            # /api/events routes
│   │   └── booking.routes.ts          # /api/bookings routes
│   ├── services/
│   │   └── email.service.ts           # Resend email templates & non-blocking dispatchers
│   ├── utils/
│   │   ├── ApiError.ts                # Custom operational error class
│   │   └── apiResponse.ts             # Standardized { success, message, data, meta } helper
│   ├── generated/
│   │   └── prisma/                    # Generated Prisma Client output
│   ├── app.ts                         # Express app setup, security middleware, routes & error handlers
│   └── server.ts                      # Database connection bootstrap & graceful shutdown
├── .env.example                       # Environment variable template
├── package.json
├── prisma.config.ts
├── tsconfig.json
└── readme.md
```

---

## Environment Variables Setup

Copy `.env.example` to `.env` and populate the required values:

```bash
cp .env.example .env
```

| Variable | Description | Example |
| --- | --- | --- |
| `PORT` | HTTP server port | `5000` |
| `NODE_ENV` | Runtime environment (`development` \| `production`) | `development` |
| `DATABASE_URL` | MongoDB connection string for Prisma | `mongodb+srv://...` |
| `JWT_SECRET` | Secret key used to sign and verify JWTs | `your-strong-random-secret` |
| `JWT_EXPIRES_IN` | JWT expiration duration | `7d` |
| `RESEND_API_KEY` | Resend API key for transactional emails | `re_xxxxxxxxx` |
| `RESEND_FROM_EMAIL` | Sender email address (defaults to Resend test sender) | `onboarding@resend.dev` |

---

## Database Schema Overview

Defined in [prisma/schema.prisma](file:///c:/Users/User/OneDrive/Desktop/academy/event-and-ticket-booking-rest-api/prisma/schema.prisma) for MongoDB via Prisma ORM:

### Core Collections
1. **`User`**
   - `id` (`ObjectId`), `firstName`, `lastName`, `email` (`@unique`), `password` (hashed), `phone` (`@unique`), `designation?`, `status` (`AccountStatus`: `active` | `inactive` | `suspended`, default: `active`), `role` (`Role`: `user` | `admin`, default: `user`), `emailVerfication` (`Boolean`, default: `false`), `createdAt`, `updatedAt`.
   - **Relations:** Has many `Event` (as organizer), `Booking`, and `Payment`.
2. **`Event`**
   - `id` (`ObjectId`), `name` (event title), `shortDescription`, `description?`, `category?`, `location?`, `startTime?` (`DateTime` event start), `endTime?` (`DateTime`), `status` (`EventStatus`: `draft` | `published`), `price` (`Float?` / `Int?`), `seat` (`Int?` total seats), `availableSeats` (`Int?` remaining seats), `banner?`, `organizerId?` (`ObjectId` -> `User`), `createdAt`, `updatedAt`.
   - **Relations:** Belongs to `User` (`organizer`); has many `Guest`, `Coupon`, `Booking`, and `Payment`.
3. **`Booking`**
   - `id` (`ObjectId`), `status` (`BookingStatus`: `pending` | `canceled` | `booked`), `seatsBooked` (`Int`), `totalPrice` (`Float`), `userId` (`ObjectId` -> `User`), `eventId` (`ObjectId` -> `Event`), `createdAt`, `updatedAt`.
   - **Relations:** Links a `User` to an `Event`; has many `Payment`.

### Additional Domain Collections
- **`Guest`** — Speakers/guests associated with an `Event` (`name`, `designation`, `company`, `shortDescription`, `eventId`).
- **`Coupon`** — Discount codes scoped to an `Event` (`code`, `discount`, `eventId`).
- **`Payment`** — Payment records linked to `User`, `Event`, `Booking`, and optional `Coupon` (`price`, `status`: `pending` | `paid` | `rejected`).

---

## Transactional Emails (Resend)

The API integrates **Resend** (`onboarding@resend.dev` by default in dev) with **non-blocking** dispatch—database mutations commit first, and any email errors are logged without failing the HTTP response:
1. **Welcome Email** — Sent upon successful registration (`POST /api/auth/register`).
2. **Booking Confirmation Email** — Sent when tickets are booked (`POST /api/bookings`).
3. **Booking Cancellation Email** — Sent when a `booked` reservation is cancelled (`PATCH /api/bookings/:id/cancel`).

---

## API Endpoints Documentation

All responses follow the standardized JSON envelope:

```json
{
  "success": true,
  "message": "Descriptive status message",
  "data": {},
  "meta": {}
}
```

### System

| Method | Endpoint | Access / Guard | Description |
| --- | --- | --- | --- |
| `GET` | `/health` | Public | Server health check (`status`, `timestamp`) |

### Authentication & User Profile

| Method | Endpoint | Access / Guard | Description |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Public (Rate-limited) | Validate input with Zod, hash password, create `user` account, send Resend welcome email |
| `POST` | `/api/auth/login` | Public (Rate-limited) | Verify credentials & active status, issue signed JWT (`userId`, `role`) |
| `GET` | `/api/users/me` | Authenticated (`verifyAuth`) | Return logged-in user's profile (excluding password) |
| `PUT` | `/api/users/me` | Authenticated (`verifyAuth`) | Update authenticated user's profile (`firstName`, `lastName`, `email`, `phone`, `designation`) |

### Event Management & Public Discovery

| Method | Endpoint | Access / Guard | Description |
| --- | --- | --- | --- |
| `POST` | `/api/events` | Admin Only (`verifyAuth` + `restrictTo("admin")`) | Create event, bind `organizerId = req.user.id`, initialize `availableSeats = seat` |
| `GET` | `/api/events` | Public | List events with search (`name`, `location`), filters (`category`, `minPrice`, `maxPrice`), sorting (`startTime`, `price`), and pagination (`page`, `limit`, `meta`) |
| `GET` | `/api/events/:id` | Public | Fetch single event details including organizer info |
| `PATCH` | `/api/events/:id` | Owner Admin (`verifyAuth` + `restrictTo("admin")`) | Verify creator ownership (`403` otherwise), block past-event edits, recalculate `availableSeats` if `seat` changes |
| `DELETE` | `/api/events/:id` | Owner Admin (`verifyAuth` + `restrictTo("admin")`) | Verify creator ownership and delete event (blocked with `400` if any `booked` bookings exist) |

### Ticket Booking & Seat Inventory

| Method | Endpoint | Access / Guard | Description |
| --- | --- | --- | --- |
| `POST` | `/api/bookings` | Authenticated (`verifyAuth`) | Validate upcoming event & seat availability, compute `totalPrice`, atomically decrement `availableSeats`, create `booked` record, send confirmation email |
| `GET` | `/api/bookings/my-tickets` | Authenticated (`verifyAuth`) | Retrieve current user's bookings populated with event `name`, `startTime`, and `location` |
| `PATCH` | `/api/bookings/:id/cancel` | Booking Owner (`verifyAuth`) | Cancel own `booked` reservation (`canceled`), restore `seatsBooked` to event's `availableSeats`, send cancellation email |

---

## Setup & Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Fill in DATABASE_URL, JWT_SECRET, RESEND_API_KEY, RESEND_FROM_EMAIL
   ```

3. **Generate Prisma Client & push schema to MongoDB**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Run in development mode**
   ```bash
   npm run dev
   ```

5. **Build & run for production**
   ```bash
   npm run build
   npm start
   ```

6. **API Testing**
   - Import the Postman Collection (`postman/event-booking-api.postman_collection.json`) and configure `baseUrl` and `token` to test all endpoints.

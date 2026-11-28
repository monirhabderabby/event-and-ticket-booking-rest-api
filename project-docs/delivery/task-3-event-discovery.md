# Task 3: Public Event Discovery — Search, Filter, Sort & Pagination (Module C)

## Objective & Scope
Implement public endpoints for browsing events with dynamic search, multi-criteria filtering, sorting, and pagination metadata, plus fetching single event details populated with organizer contact information (`firstName`, `lastName`, `email`).

---

## Specific Files to Create / Update
- `src/modules/event/event.validation.ts` *(update)* — Add `listEventsQuerySchema` (query coercion & validation for `category`, `location`, `name` / `title`, `search`, `minPrice`, `maxPrice`, `sortBy`, `sortOrder`, `page`, `limit`).
- `src/modules/event/event.controller.ts` *(update)* — Implement `getAllEvents` and `getEventById`.
- `src/routes/event.routes.ts` *(update)* — Register public `GET /` and `GET /:id` routes with Zod validation.

---

## Detailed Checklist of Requirements & Edge Cases
- [ ] **List All Events (`GET /api/events`):**
  - Public access (no `verifyAuth` required).
  - **Search & Filter:**
    - `category`: Filter by category (case-insensitive match).
    - `location`: Case-insensitive partial match (`contains`, `mode: "insensitive"`).
    - `name` (or `title` alias if passed): Case-insensitive partial match (`contains`, `mode: "insensitive"`).
    - `search`: Optional general partial match across `name` and `location` (case-insensitive).
    - `minPrice` & `maxPrice`: Numeric price range filtering (`gte` / `lte`); validate `minPrice >= 0`, `maxPrice >= 0`, and `minPrice <= maxPrice` (`400` otherwise).
  - **Sorting:**
    - Support `sortBy` (`startTime` / `date` -> mapped to `startTime`, or `price`; default: `startTime`).
    - Support `sortOrder` (`asc` | `desc`, default: `asc`).
  - **Pagination:**
    - `page` (positive int, default `1`) and `limit` (positive int, default `10`, max `100`).
    - Execute `findMany` and `count` concurrently with the same `where` filter.
    - Return `meta`: `{ total, page, limit, totalPages }`.
- [ ] **Single Event Details (`GET /api/events/:id`):**
  - Public access.
  - Validate `:id` as a 24-char MongoDB ObjectId (`400 Bad Request` if invalid).
  - Fetch event populated with organizer info: `organizer: { select: { id: true, firstName: true, lastName: true, email: true } }` (never expose `password`).
  - Return `404 Not Found` if event does not exist.
  - Return `200 OK` with standardized JSON response.

---

## Acceptance Criteria
1. `GET /api/events` is publicly accessible and filters accurately by `category`, partial `name`/`location`, `minPrice`/`maxPrice`, `sortBy`, `sortOrder`, `page`, and `limit`.
2. Invalid query params (`minPrice < 0`, `minPrice > maxPrice`, `page <= 0`, unsupported `sortBy`) return `400 Bad Request`.
3. `meta` accurately reports `total`, `page`, `limit`, and `totalPages`.
4. `GET /api/events/:id` returns full event details and organizer `firstName`, `lastName`, and `email` without sensitive fields.

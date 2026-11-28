import { Router } from "express";
import { verifyAuth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  cancelBooking,
  createBooking,
  getMyTickets,
} from "../modules/booking/booking.controller.js";
import {
  bookingIdParamSchema,
  createBookingSchema,
} from "../modules/booking/booking.validation.js";

const router = Router();

router.post(
  "/",
  verifyAuth,
  validate({ body: createBookingSchema }),
  createBooking,
);

// Must be registered before parameterized /:id routes
router.get("/my-tickets", verifyAuth, getMyTickets);

router.patch(
  "/:id/cancel",
  verifyAuth,
  validate({ params: bookingIdParamSchema }),
  cancelBooking,
);

export default router;

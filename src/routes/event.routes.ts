import { Router } from "express";
import { restrictTo, verifyAuth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  createEvent,
  deleteEvent,
  getAllEvents,
  getEventById,
  updateEvent,
} from "../modules/event/event.controller.js";
import {
  createEventSchema,
  eventIdParamSchema,
  listEventsQuerySchema,
  updateEventSchema,
} from "../modules/event/event.validation.js";

const router = Router();

// Public discovery
router.get("/", validate({ query: listEventsQuerySchema }), getAllEvents);
router.get("/:id", validate({ params: eventIdParamSchema }), getEventById);

router.post(
  "/",
  verifyAuth,
  restrictTo("admin"),
  validate({ body: createEventSchema }),
  createEvent,
);

router.patch(
  "/:id",
  verifyAuth,
  restrictTo("admin"),
  validate({ params: eventIdParamSchema, body: updateEventSchema }),
  updateEvent,
);

router.delete(
  "/:id",
  verifyAuth,
  restrictTo("admin"),
  validate({ params: eventIdParamSchema }),
  deleteEvent,
);

export default router;

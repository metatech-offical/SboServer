import { Router } from "express";
import authenticate from "../middlewares/authenticate";
import { validator } from "../middlewares/validator";
import { isCreator } from "../middlewares/creator.middleware";
import * as EventController from "../controllers/eventControllers/event.controller";
import * as EventActionsController from "../controllers/eventControllers/eventActions.controller";
import {
  createEventSchema,
  getEventsSchema,
  getEventByIdSchema,
  getEventsByCreatorSchema,
  updateEventSchema,
} from "../validators/event.validator";

const eventRouter = Router();

// Public routes (with authentication)
eventRouter.use(authenticate);

// GET /events - Get all events with filters
eventRouter.get(
  "/",
  validator.query(getEventsSchema.query),
  EventController.httpGetAllEvents
);

// GET /events/:eventId - Get a specific event by ID
eventRouter.get(
  "/:eventId",
  validator.params(getEventByIdSchema.params),
  EventController.httpGetEventById
);

// GET /events/creator/:creatorId - Get all events by a specific creator
eventRouter.get(
  "/creator/:creatorId",
  validator.params(getEventsByCreatorSchema.params),
  validator.query(getEventsByCreatorSchema.query),
  EventController.httpGetEventsByCreator
);

// Creator-only routes
// POST /events/create - Create a new event (creators only)
eventRouter.post(
  "/create",
  isCreator,
  validator.body(createEventSchema.body),
  EventController.httpCreateEvent
);

// PUT /events/:eventId - Update an event (creators only)
eventRouter.put(
  "/:eventId",
  isCreator,
  validator.params(updateEventSchema.params),
  validator.body(updateEventSchema.body),
  EventController.httpUpdateEvent
);

// POST /events/:eventId/postpone - Postpone an event (creators only)
eventRouter.post(
  "/:eventId/postpone",
  isCreator,
  EventActionsController.postponeEventController
);

// POST /events/:eventId/cancel - Cancel an event (creators only)
eventRouter.post(
  "/:eventId/cancel",
  isCreator,
  EventActionsController.cancelEventController
);

export default eventRouter;

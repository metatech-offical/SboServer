import { Router } from "express";
import authenticate from "../middlewares/authenticate";
import { validator } from "../middlewares/validator";
import { isCreator } from "../middlewares/creator.middleware";
import * as TicketOrderController from "../controllers/eventControllers/ticketOrder.controller";
import * as EventActionsController from "../controllers/eventControllers/eventActions.controller";
import {
  createTicketOrderSchema,
  getUserOrdersSchema,
  getOrderByIdSchema,
  cancelOrderSchema,
  getOrdersByEventSchema,
  confirmOrderSchema,
} from "../validators/ticketOrder.validator";

const ticketOrderRouter = Router();

// All routes require authentication
ticketOrderRouter.use(authenticate);

// User routes - anyone authenticated can book tickets
// POST /ticket-orders/create - Create a new ticket order
ticketOrderRouter.post(
  "/create",
  validator.body(createTicketOrderSchema.body),
  TicketOrderController.httpCreateTicketOrder
);

// GET /ticket-orders - Get current user's orders
ticketOrderRouter.get(
  "/",
  validator.query(getUserOrdersSchema.query),
  TicketOrderController.httpGetUserOrders
);

// GET /ticket-orders/:orderId - Get specific order details
ticketOrderRouter.get(
  "/:orderId",
  validator.params(getOrderByIdSchema.params),
  TicketOrderController.httpGetOrderById
);

// POST /ticket-orders/:orderId/cancel - Cancel an order
ticketOrderRouter.post(
  "/:orderId/cancel",
  validator.params(cancelOrderSchema.params),
  validator.body(cancelOrderSchema.body),
  TicketOrderController.httpCancelOrder
);

// POST /ticket-orders/:orderId/refund - Request a refund for an order
ticketOrderRouter.post(
  "/:orderId/refund",
  EventActionsController.requestRefundController
);

// Creator routes - get orders for their events
// GET /ticket-orders/event/:eventId - Get all orders for an event (creators only)
ticketOrderRouter.get(
  "/event/:eventId",
  isCreator,
  validator.params(getOrdersByEventSchema.params),
  validator.query(getOrdersByEventSchema.query),
  TicketOrderController.httpGetOrdersByEvent
);

// Payment confirmation route (for future integration)
// POST /ticket-orders/:orderId/confirm - Confirm payment (internal use)
ticketOrderRouter.post(
  "/:orderId/confirm",
  validator.params(confirmOrderSchema.params),
  validator.body(confirmOrderSchema.body),
  TicketOrderController.httpConfirmOrder
);

export default ticketOrderRouter;

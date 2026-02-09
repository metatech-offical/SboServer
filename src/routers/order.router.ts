import { Router } from "express";
import {
  createOrderValidator,
  orderIdValidator,
  orderListValidator,
  orderStatusValidator,
} from "../validators/order.validator";
import orderMiddleware from "../middlewares/order.middleware";
import { OrderController } from "../controllers/";
import { validator } from "../middlewares/validator";
import authenticate from "../middlewares/authenticate";
import { isCreator } from "../middlewares/creator.middleware";

const orderRouter = Router();
orderRouter.use(authenticate);

orderRouter.post(
  "/checkout",
  validator.body(createOrderValidator.body),
  orderMiddleware.hasValidAddress,
  orderMiddleware.hasValidProducts,
  OrderController.httpCreateOrder
);

// below API gives list of creator's store orders to creator
orderRouter.get(
  "/list",
  isCreator,
  validator.query(orderListValidator.query),
  OrderController.httpGetOrdersList
);

// Return user's order history
orderRouter.get(
  "/history",
  validator.query(orderListValidator.query),
  OrderController.httpGetOrderHistory
);

orderRouter.get(
  "/data/:orderId",
  validator.params(orderIdValidator),
  OrderController.httpGetOrderById
);

orderRouter.patch(
  "/status",
  validator.body(orderStatusValidator.body),
  OrderController.httpUpdateOrderStatus
);

export default orderRouter;

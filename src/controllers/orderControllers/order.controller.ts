import { Request, Response } from "express";
import {
  ErrorResponse,
  printError,
  SuccessResponse,
} from "../../utils/responseHandler";
import { OrderService } from "../../services";
import { AuthenticatedRequest } from "../../types/express";
import { EOrderStatus } from "../../models/orders/order.types";

export const httpCreateOrder = async (req: Request, res: Response) => {
  try {
    const { checkoutItems, products, address, checkoutType, storeOwnerId } =
      req.body;
    const userId = (req as AuthenticatedRequest).user._id;
    const result = await OrderService.createOrder({
      userId,
      address,
      products,
      checkoutItems,
      checkoutType,
      creatorId: storeOwnerId,
    });

    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (err) {
    printError(err, "httpCreateOrder");
    return ErrorResponse(res);
  }
};

// apply pagination in list api
export const httpGetOrdersList = async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 10);
    const userId = (req as AuthenticatedRequest).user._id;
    const creatorId = req.query.creatorId || userId;
    const result = await OrderService.getOrdersList(
      String(creatorId),
      page,
      limit,
      req.query.status as EOrderStatus
    );

    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (err) {
    printError(err, "httpGetOrdersList");
    return ErrorResponse(res);
  }
};

// apply pagination in list api
export const httpGetOrderHistory = async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 10);
    const userId = (req as AuthenticatedRequest).user._id;
    const status = req.query.status as EOrderStatus;
    const result = await OrderService.getOrderHistory(
      String(userId),
      page,
      limit,
      status
    );

    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (err) {
    printError(err, "httpGetOrderHistory");
    return ErrorResponse(res);
  }
};
export const httpGetOrderById = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const result = await OrderService.getOrderById(orderId);

    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (err) {
    printError(err, "httpGetOrderById");
    return ErrorResponse(res);
  }
};

export const httpUpdateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { orderId, status } = req.body;
    const user = (req as AuthenticatedRequest).user;

    const result = await OrderService.updateOrderStatus({
      orderId,
      status,
      user,
    });

    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (err) {
    printError(err, "httpUpdateOrderStatus");
    return ErrorResponse(res);
  }
};

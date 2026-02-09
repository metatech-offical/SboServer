import { Request, Response } from "express";
import { Types } from "mongoose";
import * as TicketOrderService from "../../services/eventService/ticketOrder.service";
import {
  ErrorResponse,
  printError,
  SuccessResponse,
  UnauthorizedErrorResponse,
} from "../../utils/responseHandler";
import { STATUS_CODES } from "../../constants/statusCodes";
import { TICKET_ORDER_MESSAGES } from "../../constants/responseMessage";

export const httpCreateTicketOrder = async (req: Request, res: Response) => {
  try {
    const { eventId, tickets } = req.body;

    const userId = req.user?._id;
    const user = req.user;

    if (!userId || !user) {
      return UnauthorizedErrorResponse(res, "User not authenticated");
    }

    // Attendee info is automatically taken from the logged-in user
    const result = await TicketOrderService.createTicketOrder({
      userId,
      eventId,
      tickets,
      attendeeEmail: user.email,
      attendeeName: user.displayName || user.username,
      attendeePhone: user.phoneNumber || undefined,
    });

    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (err) {
    printError(err, "httpCreateTicketOrder");
    return ErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      TICKET_ORDER_MESSAGES.INTERNAL_ERROR
    );
  }
};

export const httpGetUserOrders = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return UnauthorizedErrorResponse(res, "User not authenticated");
    }

    const { status, page, limit } = req.query;

    const result = await TicketOrderService.getUserOrders(userId, {
      status: status as any,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 10,
    });

    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (err) {
    printError(err, "httpGetUserOrders");
    return ErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      TICKET_ORDER_MESSAGES.INTERNAL_ERROR
    );
  }
};

export const httpGetOrderById = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      return UnauthorizedErrorResponse(res, "User not authenticated");
    }

    if (!Types.ObjectId.isValid(orderId)) {
      return ErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        false,
        "Invalid order ID"
      );
    }

    const result = await TicketOrderService.getOrderById(
      new Types.ObjectId(orderId),
      userId
    );

    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (err) {
    printError(err, "httpGetOrderById");
    return ErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      TICKET_ORDER_MESSAGES.INTERNAL_ERROR
    );
  }
};

export const httpGetOrdersByEvent = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const creatorId = req.user?._id;

    if (!creatorId) {
      return UnauthorizedErrorResponse(res, "User not authenticated");
    }

    if (!Types.ObjectId.isValid(eventId)) {
      return ErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        false,
        "Invalid event ID"
      );
    }

    const { status, page, limit } = req.query;

    const result = await TicketOrderService.getOrdersByEvent(
      new Types.ObjectId(eventId),
      creatorId,
      {
        status: status as any,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 10,
      }
    );

    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (err) {
    printError(err, "httpGetOrdersByEvent");
    return ErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      TICKET_ORDER_MESSAGES.INTERNAL_ERROR
    );
  }
};

export const httpCancelOrder = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { cancellationReason } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      return UnauthorizedErrorResponse(res, "User not authenticated");
    }

    if (!Types.ObjectId.isValid(orderId)) {
      return ErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        false,
        "Invalid order ID"
      );
    }

    const result = await TicketOrderService.cancelOrder(
      new Types.ObjectId(orderId),
      userId,
      cancellationReason
    );

    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (err) {
    printError(err, "httpCancelOrder");
    return ErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      TICKET_ORDER_MESSAGES.INTERNAL_ERROR
    );
  }
};

export const httpConfirmOrder = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { paymentMethod, paymentTransactionId } = req.body;

    if (!Types.ObjectId.isValid(orderId)) {
      return ErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        false,
        "Invalid order ID"
      );
    }

    const result = await TicketOrderService.confirmOrder(
      new Types.ObjectId(orderId),
      {
        paymentMethod,
        paymentTransactionId,
      }
    );

    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (err) {
    printError(err, "httpConfirmOrder");
    return ErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      TICKET_ORDER_MESSAGES.INTERNAL_ERROR
    );
  }
};

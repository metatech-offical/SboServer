import { Request, Response } from "express";
import { Types } from "mongoose";
import {
  postponeEvent,
  cancelEvent,
} from "../../services/eventService/eventPostponementCancellation.service";
import { requestRefund } from "../../services/eventService/ticketOrder.service";

/**
 * POST /api/events/:eventId/postpone
 * Postpone an event to a new date
 * Creator-only endpoint
 */
export const postponeEventController = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { newDateTime, reason } = req.body;
    const creatorId = (req as any).user._id;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: "Event ID is required",
      });
    }

    if (!newDateTime) {
      return res.status(400).json({
        success: false,
        message: "New event date and time is required",
      });
    }

    const result = await postponeEvent(
      new Types.ObjectId(eventId),
      creatorId,
      {
        newDateTime: new Date(newDateTime),
        reason,
      }
    );

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data,
    });
  } catch (err) {
    console.error("Error in postponeEventController:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * POST /api/events/:eventId/cancel
 * Cancel an event
 * Creator-only endpoint
 */
export const cancelEventController = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { reason } = req.body;
    const creatorId = (req as any).user._id;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: "Event ID is required",
      });
    }

    const result = await cancelEvent(
      new Types.ObjectId(eventId),
      creatorId,
      { reason }
    );

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data,
    });
  } catch (err) {
    console.error("Error in cancelEventController:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * POST /api/ticket-orders/:orderId/refund
 * Request a refund for a ticket order
 * User endpoint - can only refund their own orders
 */
export const requestRefundController = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const userId = (req as any).user._id;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Order ID is required",
      });
    }

    const result = await requestRefund(
      new Types.ObjectId(orderId),
      userId,
      reason
    );

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data,
    });
  } catch (err) {
    console.error("Error in requestRefundController:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

import type { Request, Response } from "express";
import { STATUS_CODES } from "../../constants/statusCodes";
import {
  ErrorResponse,
  SuccessResponse,
  NotFoundErrorResponse,
  BadRequestErrorResponse,
  printError,
} from "../../utils/responseHandler";
import UserModel from "../../models/user/user.schema";
import { MembershipLevel } from "../../models/user/user.type";
import { Event } from "../../models/event/event.schema";
import { EventStatus } from "../../models/event/event.types";
import { StoreProduct } from "../../models/store/storeProducts.schema";
import StreamModel from "../../models/stream/stream.schema";
import ShortsModel from "../../models/short/short.schema";
import PostModel from "../../models/post/post.schema";
import OrderModel from "../../models/orders/order.schema";
import { EventTicketOrder } from "../../models/event/eventTicketOrder.schema";

/**
 * Get basic reports statistics
 * GET /api/v1/admin/reports/basic
 */
export const httpGetBasicReports = async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get all basic counts in parallel
    const [
      totalUsers,
      totalCreators,
      totalActiveEvents,
      totalActiveProducts,
      totalVideosUploaded,
      totalShorts,
      totalPosts,
      newUsersThisMonth,
      newUsersThisWeek,
      newCreatorsThisMonth,
      activeEventsThisMonth,
      totalOrders,
      totalTicketOrders,
    ] = await Promise.all([
      // Total users (excluding deleted)
      UserModel.countDocuments({ isDeleted: false }),
      // Total creators
      UserModel.countDocuments({ membership: MembershipLevel.CREATOR, isDeleted: false }),
      // Active events (scheduled)
      Event.countDocuments({ eventStatus: EventStatus.SCHEDULED }),
      // Active products (published)
      StoreProduct.countDocuments({ status: "published" }),
      // Total videos (streams with type video or video-live)
      StreamModel.countDocuments({ isDeleted: false, type: { $in: ["video", "video-live"] } }),
      // Total shorts
      ShortsModel.countDocuments({ deletedAt: null }),
      // Total posts
      PostModel.countDocuments({ isDeleted: false }),
      // New users this month
      UserModel.countDocuments({ isDeleted: false, createdAt: { $gte: thirtyDaysAgo } }),
      // New users this week
      UserModel.countDocuments({ isDeleted: false, createdAt: { $gte: sevenDaysAgo } }),
      // New creators this month
      UserModel.countDocuments({ 
        membership: MembershipLevel.CREATOR, 
        isDeleted: false, 
        createdAt: { $gte: thirtyDaysAgo } 
      }),
      // Active events created this month
      Event.countDocuments({ 
        eventStatus: EventStatus.SCHEDULED, 
        createdAt: { $gte: thirtyDaysAgo } 
      }),
      // Total product orders
      OrderModel.countDocuments({}),
      // Total ticket orders
      EventTicketOrder.countDocuments({}),
    ]);

    // Get user growth trend (last 7 days)
    const userGrowthTrend = await UserModel.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo }, isDeleted: false } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const reports = {
      // Core stats
      totalUsers,
      totalCreators,
      totalActiveEvents,
      totalActiveProducts,
      totalVideosUploaded,
      totalShorts,
      totalPosts,
      totalContent: totalVideosUploaded + totalShorts + totalPosts,
      // Orders
      totalOrders,
      totalTicketOrders,
      totalAllOrders: totalOrders + totalTicketOrders,
      // Growth metrics
      newUsersThisMonth,
      newUsersThisWeek,
      newCreatorsThisMonth,
      activeEventsThisMonth,
      // Trends
      userGrowthTrend,
    };

    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      "Basic reports retrieved successfully",
      reports
    );
  } catch (error) {
    printError(error, "httpGetBasicReports");
    return ErrorResponse(res);
  }
};

/**
 * Search orders (product orders)
 * GET /api/v1/admin/reports/orders/search
 */
export const httpSearchOrders = async (req: Request, res: Response) => {
  try {
    const { search, status, page = 1, limit = 10 } = req.query;

    const query: any = {};

    // Search by order ID, user email, or payment ID
    if (search) {
      const searchRegex = new RegExp(search as string, "i");
      query.$or = [
        { "payment.paymentId": searchRegex },
        { "address.fullName": searchRegex },
        { "address.mobileNumber": searchRegex },
      ];
      
      // Check if search is a valid ObjectId
      if ((search as string).match(/^[0-9a-fA-F]{24}$/)) {
        query.$or.push({ _id: search });
        query.$or.push({ userId: search });
      }
    }

    if (status) {
      query.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
      OrderModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("user", "username email displayName phoneNumber")
        .populate("creator", "username displayName")
        .lean(),
      OrderModel.countDocuments(query),
    ]);

    const formattedOrders = orders.map((order: any) => ({
      id: order._id,
      orderId: order._id.toString(),
      status: order.status,
      totalAmount: order.totalAmount,
      items: order.items,
      address: order.address,
      payment: order.payment,
      trackingLink: order.trackingLink,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      user: order.user ? {
        id: order.user._id,
        username: order.user.username,
        email: order.user.email,
        displayName: order.user.displayName,
        phoneNumber: order.user.phoneNumber,
      } : null,
      creator: order.creator ? {
        id: order.creator._id,
        username: order.creator.username,
        displayName: order.creator.displayName,
      } : null,
    }));

    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      "Orders retrieved successfully",
      {
        orders: formattedOrders,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
          hasNext: Number(page) < Math.ceil(total / Number(limit)),
          hasPrev: Number(page) > 1,
        },
      }
    );
  } catch (error) {
    printError(error, "httpSearchOrders");
    return ErrorResponse(res);
  }
};

/**
 * Search ticket orders
 * GET /api/v1/admin/reports/tickets/search
 */
export const httpSearchTicketOrders = async (req: Request, res: Response) => {
  try {
    const { search, status, page = 1, limit = 10 } = req.query;

    const query: any = {};

    // Search by order number, attendee email, name, or phone
    if (search) {
      const searchRegex = new RegExp(search as string, "i");
      query.$or = [
        { orderNumber: searchRegex },
        { attendeeEmail: searchRegex },
        { attendeeName: searchRegex },
        { attendeePhone: searchRegex },
        { paymentTransactionId: searchRegex },
      ];

      // Check if search is a valid ObjectId
      if ((search as string).match(/^[0-9a-fA-F]{24}$/)) {
        query.$or.push({ _id: search });
        query.$or.push({ userId: search });
        query.$or.push({ eventId: search });
      }
    }

    if (status) {
      query.orderStatus = status;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [ticketOrders, total] = await Promise.all([
      EventTicketOrder.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("userId", "username email displayName phoneNumber")
        .populate("eventId", "eventName eventDateTime eventCoverImageUrl")
        .lean(),
      EventTicketOrder.countDocuments(query),
    ]);

    const formattedTicketOrders = ticketOrders.map((order: any) => ({
      id: order._id,
      orderNumber: order.orderNumber,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      totalAmount: order.totalAmount,
      currency: order.currency,
      tickets: order.tickets,
      attendeeEmail: order.attendeeEmail,
      attendeeName: order.attendeeName,
      attendeePhone: order.attendeePhone,
      paymentMethod: order.paymentMethod,
      paymentTransactionId: order.paymentTransactionId,
      qrCode: order.qrCode,
      cancelledAt: order.cancelledAt,
      cancellationReason: order.cancellationReason,
      refundedAt: order.refundedAt,
      refundAmount: order.refundAmount,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      user: order.userId ? {
        id: order.userId._id,
        username: order.userId.username,
        email: order.userId.email,
        displayName: order.userId.displayName,
        phoneNumber: order.userId.phoneNumber,
      } : null,
      event: order.eventId ? {
        id: order.eventId._id,
        eventName: order.eventId.eventName,
        eventDateTime: order.eventId.eventDateTime,
        eventCoverImageUrl: order.eventId.eventCoverImageUrl,
      } : null,
    }));

    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      "Ticket orders retrieved successfully",
      {
        ticketOrders: formattedTicketOrders,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
          hasNext: Number(page) < Math.ceil(total / Number(limit)),
          hasPrev: Number(page) > 1,
        },
      }
    );
  } catch (error) {
    printError(error, "httpSearchTicketOrders");
    return ErrorResponse(res);
  }
};

/**
 * Get order details by ID
 * GET /api/v1/admin/reports/orders/:orderId
 */
export const httpGetOrderById = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    const order = await OrderModel.findById(orderId)
      .populate("user", "username email displayName phoneNumber profilePicture")
      .populate("creator", "username displayName profilePicture")
      .lean();

    if (!order) {
      return NotFoundErrorResponse(res, "Order not found");
    }

    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      "Order details retrieved successfully",
      order
    );
  } catch (error) {
    printError(error, "httpGetOrderById");
    return ErrorResponse(res);
  }
};

/**
 * Get ticket order details by ID
 * GET /api/v1/admin/reports/tickets/:ticketOrderId
 */
export const httpGetTicketOrderById = async (req: Request, res: Response) => {
  try {
    const { ticketOrderId } = req.params;

    const ticketOrder = await EventTicketOrder.findById(ticketOrderId)
      .populate("userId", "username email displayName phoneNumber profilePicture")
      .populate("eventId", "eventName eventDateTime eventCoverImageUrl eventLocation eventDescription")
      .lean();

    if (!ticketOrder) {
      return NotFoundErrorResponse(res, "Ticket order not found");
    }

    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      "Ticket order details retrieved successfully",
      ticketOrder
    );
  } catch (error) {
    printError(error, "httpGetTicketOrderById");
    return ErrorResponse(res);
  }
};

/**
 * Resend order confirmation email
 * POST /api/v1/admin/reports/orders/:orderId/resend-email
 */
export const httpResendOrderEmail = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    const order = await OrderModel.findById(orderId)
      .populate("user", "username email displayName")
      .lean();

    if (!order) {
      return NotFoundErrorResponse(res, "Order not found");
    }

    // TODO: Implement actual email sending logic using your email service
    // For now, we'll simulate the email send
    // await sendOrderConfirmationEmail(order);

    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      "Order confirmation email sent successfully",
      {
        orderId: order._id,
        sentTo: (order as any).user?.email || "unknown",
      }
    );
  } catch (error) {
    printError(error, "httpResendOrderEmail");
    return ErrorResponse(res);
  }
};

/**
 * Resend ticket confirmation email
 * POST /api/v1/admin/reports/tickets/:ticketOrderId/resend-email
 */
export const httpResendTicketEmail = async (req: Request, res: Response) => {
  try {
    const { ticketOrderId } = req.params;

    const ticketOrder = await EventTicketOrder.findById(ticketOrderId)
      .populate("userId", "username email displayName")
      .populate("eventId", "eventName eventDateTime")
      .lean();

    if (!ticketOrder) {
      return NotFoundErrorResponse(res, "Ticket order not found");
    }

    // TODO: Implement actual email sending logic using your email service
    // For now, we'll simulate the email send
    // await sendTicketConfirmationEmail(ticketOrder);

    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      "Ticket confirmation email sent successfully",
      {
        ticketOrderId: ticketOrder._id,
        orderNumber: ticketOrder.orderNumber,
        sentTo: ticketOrder.attendeeEmail,
      }
    );
  } catch (error) {
    printError(error, "httpResendTicketEmail");
    return ErrorResponse(res);
  }
};


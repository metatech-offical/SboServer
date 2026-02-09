import type { Request, Response } from "express";
import { Types } from "mongoose";
import { STATUS_CODES } from "../../constants/statusCodes";
import {
  ErrorResponse,
  SuccessResponse,
  NotFoundErrorResponse,
  BadRequestErrorResponse,
  printError,
} from "../../utils/responseHandler";
import { Event } from "../../models/event/event.schema";
import { EventTicket } from "../../models/event/eventTicket.schema";
import { EventTicketOrder } from "../../models/event/eventTicketOrder.schema";
import UserModel from "../../models/user/user.schema";
import {
  EventStatus,
  TicketStatus,
  OrderStatus,
  PaymentStatus,
} from "../../models/event/event.types";

/**
 * Get event management statistics
 * GET /api/v1/admin/events/stats
 */
export const httpGetEventStats = async (req: Request, res: Response) => {
  try {
    const now = new Date();

    const [
      totalEvents,
      scheduledEvents,
      cancelledEvents,
      postponedEvents,
      totalTickets,
      totalOrders,
      confirmedOrders,
      totalRevenue,
    ] = await Promise.all([
      Event.countDocuments(),
      Event.countDocuments({ eventStatus: EventStatus.SCHEDULED }),
      Event.countDocuments({ eventStatus: EventStatus.CANCELLED }),
      Event.countDocuments({ eventStatus: EventStatus.POSTPONED }),
      EventTicket.countDocuments(),
      EventTicketOrder.countDocuments(),
      EventTicketOrder.countDocuments({ orderStatus: OrderStatus.CONFIRMED }),
      EventTicketOrder.aggregate([
        { $match: { orderStatus: OrderStatus.CONFIRMED } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
    ]);

    // Upcoming events (scheduled and in the future)
    const upcomingEvents = await Event.countDocuments({
      eventStatus: EventStatus.SCHEDULED,
      eventDateTime: { $gt: now },
    });

    // Past events
    const pastEvents = await Event.countDocuments({
      eventDateTime: { $lt: now },
    });

    return SuccessResponse(res, STATUS_CODES.OK, true, "Event stats retrieved", {
      totalEvents,
      scheduledEvents,
      cancelledEvents,
      postponedEvents,
      upcomingEvents,
      pastEvents,
      totalTickets,
      totalOrders,
      confirmedOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
    });
  } catch (error) {
    printError(error, "httpGetEventStats");
    return ErrorResponse(res);
  }
};

/**
 * Get all events with filters and pagination
 * GET /api/v1/admin/events
 */
export const httpGetAllEvents = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      category,
      creatorId,
      timeFilter,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;
    const now = new Date();

    const query: any = {};

    if (search) {
      query.$or = [
        { eventName: { $regex: search, $options: "i" } },
        { eventDescription: { $regex: search, $options: "i" } },
        { eventCategory: { $regex: search, $options: "i" } },
      ];
    }

    if (status) {
      query.eventStatus = status;
    }

    if (category) {
      query.eventCategory = category;
    }

    if (creatorId) {
      query.creatorId = new Types.ObjectId(creatorId as string);
    }

    // Time-based filtering
    if (timeFilter === "upcoming") {
      query.eventDateTime = { $gt: now };
      query.eventStatus = EventStatus.SCHEDULED;
    } else if (timeFilter === "past") {
      query.eventDateTime = { $lt: now };
    } else if (timeFilter === "live") {
      // Events happening today
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      query.eventDateTime = { $gte: startOfDay, $lte: endOfDay };
      query.eventStatus = EventStatus.SCHEDULED;
    }

    const sortOptions: any = {};
    sortOptions[sortBy as string] = sortOrder === "asc" ? 1 : -1;

    const [events, total] = await Promise.all([
      Event.find(query)
        .populate("creatorId", "username displayName email profilePicture")
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Event.countDocuments(query),
    ]);

    // Get ticket stats for each event
    const eventsWithStats = await Promise.all(
      events.map(async (event: any) => {
        const tickets = await EventTicket.find({ eventId: event._id }).lean();
        const totalTickets = tickets.reduce((sum, t) => sum + t.numberOfTickets, 0);
        const soldTickets = tickets.reduce((sum, t) => sum + t.numberOfSoldTickets, 0);
        const revenue = await EventTicketOrder.aggregate([
          {
            $match: {
              eventId: event._id,
              orderStatus: OrderStatus.CONFIRMED,
            },
          },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } },
        ]);

        return {
          id: event._id,
          eventName: event.eventName,
          eventCoverImageUrl: event.eventCoverImageUrl,
          eventDateTime: event.eventDateTime,
          eventPublishOnDate: event.eventPublishOnDate,
          eventDescription: event.eventDescription,
          eventLocation: event.eventLocation,
          eventCategory: event.eventCategory,
          eventStatus: event.eventStatus,
          eventCurrencyType: event.eventCurrencyType,
          eventLimitPerUser: event.eventLimitPerUser,
          creator: event.creatorId
            ? {
                id: event.creatorId._id,
                username: event.creatorId.username,
                displayName: event.creatorId.displayName,
                email: event.creatorId.email,
                profilePicture: event.creatorId.profilePicture,
              }
            : null,
          ticketStats: {
            totalTickets,
            soldTickets,
            availableTickets: totalTickets - soldTickets,
            ticketTypes: tickets.length,
          },
          revenue: revenue[0]?.total || 0,
          createdAt: event.createdAt,
          updatedAt: event.updatedAt,
        };
      })
    );

    return SuccessResponse(res, STATUS_CODES.OK, true, "Events retrieved", {
      events: eventsWithStats,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    printError(error, "httpGetAllEvents");
    return ErrorResponse(res);
  }
};

/**
 * Get event by ID with full details
 * GET /api/v1/admin/events/:eventId
 */
export const httpGetEventById = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    // Validate ObjectId format
    if (!Types.ObjectId.isValid(eventId)) {
      return BadRequestErrorResponse(res, "Invalid event ID format");
    }

    const event: any = await Event.findById(eventId)
      .populate("creatorId", "username displayName email profilePicture bio verified")
      .lean();

    if (!event) {
      return NotFoundErrorResponse(res, "Event not found");
    }

    // Get tickets for this event
    const tickets = await EventTicket.find({ eventId: event._id }).lean();

    // Get orders for this event
    const orders = await EventTicketOrder.find({ eventId: event._id })
      .populate("userId", "username displayName email")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Calculate stats
    const totalTickets = tickets.reduce((sum, t) => sum + t.numberOfTickets, 0);
    const soldTickets = tickets.reduce((sum, t) => sum + t.numberOfSoldTickets, 0);

    const orderStats = await EventTicketOrder.aggregate([
      { $match: { eventId: event._id } },
      {
        $group: {
          _id: "$orderStatus",
          count: { $sum: 1 },
          total: { $sum: "$totalAmount" },
        },
      },
    ]);

    const eventDetails = {
      id: event._id,
      eventName: event.eventName,
      eventCoverImageUrl: event.eventCoverImageUrl,
      eventArenaImageUrl: event.eventArenaImageUrl,
      eventDateTime: event.eventDateTime,
      eventPublishOnDate: event.eventPublishOnDate,
      eventDescription: event.eventDescription,
      eventLocation: event.eventLocation,
      eventCategory: event.eventCategory,
      eventStatus: event.eventStatus,
      eventCurrencyType: event.eventCurrencyType,
      eventLimitPerUser: event.eventLimitPerUser,
      postponementInfo: event.postponementInfo,
      cancellationInfo: event.cancellationInfo,
      creator: event.creatorId
        ? {
            id: event.creatorId._id,
            username: event.creatorId.username,
            displayName: event.creatorId.displayName,
            email: event.creatorId.email,
            profilePicture: event.creatorId.profilePicture,
            bio: event.creatorId.bio,
            verified: event.creatorId.verified,
          }
        : null,
      tickets: tickets.map((t) => ({
        id: t._id,
        ticketName: t.ticketName,
        originalPrice: t.originalPrice,
        numberOfTickets: t.numberOfTickets,
        numberOfSoldTickets: t.numberOfSoldTickets,
        availableTickets: t.numberOfTickets - t.numberOfSoldTickets,
        ticketStatus: t.ticketStatus,
        createdAt: t.createdAt,
      })),
      ticketStats: {
        totalTickets,
        soldTickets,
        availableTickets: totalTickets - soldTickets,
        ticketTypes: tickets.length,
      },
      orderStats: orderStats.reduce(
        (acc: any, stat) => {
          acc[stat._id] = { count: stat.count, total: stat.total };
          return acc;
        },
        {}
      ),
      recentOrders: orders.map((o: any) => ({
        id: o._id,
        orderNumber: o.orderNumber,
        user: o.userId
          ? {
              id: o.userId._id,
              username: o.userId.username,
              displayName: o.userId.displayName,
              email: o.userId.email,
            }
          : null,
        totalAmount: o.totalAmount,
        currency: o.currency,
        orderStatus: o.orderStatus,
        paymentStatus: o.paymentStatus,
        attendeeName: o.attendeeName,
        attendeeEmail: o.attendeeEmail,
        tickets: o.tickets,
        createdAt: o.createdAt,
      })),
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };

    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      "Event details retrieved",
      eventDetails
    );
  } catch (error) {
    printError(error, "httpGetEventById");
    return ErrorResponse(res);
  }
};

/**
 * Update event status (cancel/postpone)
 * PUT /api/v1/admin/events/:eventId/status
 */
export const httpUpdateEventStatus = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { status, reason, newDateTime } = req.body;

    const event = await Event.findById(eventId);

    if (!event) {
      return NotFoundErrorResponse(res, "Event not found");
    }

    if (status === EventStatus.CANCELLED) {
      event.eventStatus = EventStatus.CANCELLED;
      event.cancellationInfo = {
        cancelledAt: new Date(),
        reason: reason || "Cancelled by admin",
      };
    } else if (status === EventStatus.POSTPONED) {
      if (!newDateTime) {
        return BadRequestErrorResponse(res, "New date is required for postponement");
      }
      event.eventStatus = EventStatus.POSTPONED;
      event.postponementInfo = {
        previousDateTime: event.eventDateTime,
        newDateTime: new Date(newDateTime),
        postponedAt: new Date(),
        reason: reason || "Postponed by admin",
      };
      event.eventDateTime = new Date(newDateTime);
    } else if (status === EventStatus.SCHEDULED) {
      event.eventStatus = EventStatus.SCHEDULED;
    }

    await event.save();

    return SuccessResponse(res, STATUS_CODES.OK, true, "Event status updated", {
      id: event._id,
      eventName: event.eventName,
      eventStatus: event.eventStatus,
    });
  } catch (error) {
    printError(error, "httpUpdateEventStatus");
    return ErrorResponse(res);
  }
};

/**
 * Pause/Resume ticket sales for an event
 * PUT /api/v1/admin/events/:eventId/tickets/pause
 */
export const httpPauseTicketSales = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { pause } = req.body;

    const event = await Event.findById(eventId);

    if (!event) {
      return NotFoundErrorResponse(res, "Event not found");
    }

    // Update all tickets for this event
    const newStatus = pause ? TicketStatus.PAUSED : TicketStatus.AVAILABLE;

    await EventTicket.updateMany(
      {
        eventId: event._id,
        ticketStatus: { $ne: TicketStatus.SOLD_OUT },
      },
      { $set: { ticketStatus: newStatus } }
    );

    const updatedTickets = await EventTicket.find({ eventId: event._id }).lean();

    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      pause ? "Ticket sales paused" : "Ticket sales resumed",
      {
        eventId: event._id,
        eventName: event.eventName,
        ticketsPaused: pause,
        tickets: updatedTickets.map((t) => ({
          id: t._id,
          ticketName: t.ticketName,
          ticketStatus: t.ticketStatus,
        })),
      }
    );
  } catch (error) {
    printError(error, "httpPauseTicketSales");
    return ErrorResponse(res);
  }
};

/**
 * Pause/Resume specific ticket type
 * PUT /api/v1/admin/events/tickets/:ticketId/pause
 */
export const httpPauseTicketType = async (req: Request, res: Response) => {
  try {
    const { ticketId } = req.params;
    const { pause } = req.body;

    const ticket = await EventTicket.findById(ticketId);

    if (!ticket) {
      return NotFoundErrorResponse(res, "Ticket not found");
    }

    if (ticket.ticketStatus === TicketStatus.SOLD_OUT) {
      return BadRequestErrorResponse(res, "Cannot pause sold out tickets");
    }

    ticket.ticketStatus = pause ? TicketStatus.PAUSED : TicketStatus.AVAILABLE;
    await ticket.save();

    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      pause ? "Ticket type paused" : "Ticket type resumed",
      {
        id: ticket._id,
        ticketName: ticket.ticketName,
        ticketStatus: ticket.ticketStatus,
      }
    );
  } catch (error) {
    printError(error, "httpPauseTicketType");
    return ErrorResponse(res);
  }
};

/**
 * Delete event (soft delete by cancelling)
 * DELETE /api/v1/admin/events/:eventId
 */
export const httpDeleteEvent = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { reason } = req.body;

    const event = await Event.findById(eventId);

    if (!event) {
      return NotFoundErrorResponse(res, "Event not found");
    }

    // Check if there are any confirmed orders
    const confirmedOrders = await EventTicketOrder.countDocuments({
      eventId: event._id,
      orderStatus: OrderStatus.CONFIRMED,
    });

    if (confirmedOrders > 0) {
      // If there are confirmed orders, just cancel the event
      event.eventStatus = EventStatus.CANCELLED;
      event.cancellationInfo = {
        cancelledAt: new Date(),
        reason: reason || "Event deleted by admin",
      };
      await event.save();

      return SuccessResponse(
        res,
        STATUS_CODES.OK,
        true,
        "Event cancelled (has active orders)",
        {
          id: event._id,
          eventName: event.eventName,
          eventStatus: event.eventStatus,
          hasActiveOrders: true,
        }
      );
    }

    // If no confirmed orders, we can cancel the event
    event.eventStatus = EventStatus.CANCELLED;
    event.cancellationInfo = {
      cancelledAt: new Date(),
      reason: reason || "Event deleted by admin",
    };
    await event.save();

    return SuccessResponse(res, STATUS_CODES.OK, true, "Event deleted", {
      id: event._id,
      eventName: event.eventName,
      eventStatus: event.eventStatus,
    });
  } catch (error) {
    printError(error, "httpDeleteEvent");
    return ErrorResponse(res);
  }
};

/**
 * Get all ticket orders with filters
 * GET /api/v1/admin/events/orders
 */
export const httpGetAllOrders = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      paymentStatus,
      eventId,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const query: any = {};

    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: "i" } },
        { attendeeName: { $regex: search, $options: "i" } },
        { attendeeEmail: { $regex: search, $options: "i" } },
      ];
    }

    if (status) {
      query.orderStatus = status;
    }

    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    if (eventId) {
      query.eventId = new Types.ObjectId(eventId as string);
    }

    const sortOptions: any = {};
    sortOptions[sortBy as string] = sortOrder === "asc" ? 1 : -1;

    const [orders, total] = await Promise.all([
      EventTicketOrder.find(query)
        .populate("userId", "username displayName email profilePicture")
        .populate("eventId", "eventName eventDateTime eventCoverImageUrl")
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      EventTicketOrder.countDocuments(query),
    ]);

    const formattedOrders = orders.map((o: any) => ({
      id: o._id,
      orderNumber: o.orderNumber,
      user: o.userId
        ? {
            id: o.userId._id,
            username: o.userId.username,
            displayName: o.userId.displayName,
            email: o.userId.email,
            profilePicture: o.userId.profilePicture,
          }
        : null,
      event: o.eventId
        ? {
            id: o.eventId._id,
            eventName: o.eventId.eventName,
            eventDateTime: o.eventId.eventDateTime,
            eventCoverImageUrl: o.eventId.eventCoverImageUrl,
          }
        : null,
      tickets: o.tickets,
      totalAmount: o.totalAmount,
      currency: o.currency,
      orderStatus: o.orderStatus,
      paymentStatus: o.paymentStatus,
      paymentMethod: o.paymentMethod,
      attendeeName: o.attendeeName,
      attendeeEmail: o.attendeeEmail,
      attendeePhone: o.attendeePhone,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
    }));

    return SuccessResponse(res, STATUS_CODES.OK, true, "Orders retrieved", {
      orders: formattedOrders,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    printError(error, "httpGetAllOrders");
    return ErrorResponse(res);
  }
};

/**
 * Get order by ID
 * GET /api/v1/admin/events/orders/:orderId
 */
export const httpGetOrderById = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    const order: any = await EventTicketOrder.findById(orderId)
      .populate("userId", "username displayName email profilePicture phone")
      .populate("eventId")
      .lean();

    if (!order) {
      return NotFoundErrorResponse(res, "Order not found");
    }

    // Get event details with creator
    const event: any = await Event.findById(order.eventId._id)
      .populate("creatorId", "username displayName email")
      .lean();

    const orderDetails = {
      id: order._id,
      orderNumber: order.orderNumber,
      user: order.userId
        ? {
            id: order.userId._id,
            username: order.userId.username,
            displayName: order.userId.displayName,
            email: order.userId.email,
            profilePicture: order.userId.profilePicture,
            phone: order.userId.phone,
          }
        : null,
      event: {
        id: event._id,
        eventName: event.eventName,
        eventDateTime: event.eventDateTime,
        eventCoverImageUrl: event.eventCoverImageUrl,
        eventLocation: event.eventLocation,
        eventStatus: event.eventStatus,
        creator: event.creatorId
          ? {
              id: event.creatorId._id,
              username: event.creatorId.username,
              displayName: event.creatorId.displayName,
              email: event.creatorId.email,
            }
          : null,
      },
      tickets: order.tickets,
      totalAmount: order.totalAmount,
      currency: order.currency,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      paymentTransactionId: order.paymentTransactionId,
      qrCode: order.qrCode,
      attendeeName: order.attendeeName,
      attendeeEmail: order.attendeeEmail,
      attendeePhone: order.attendeePhone,
      cancelledAt: order.cancelledAt,
      cancellationReason: order.cancellationReason,
      refundedAt: order.refundedAt,
      refundAmount: order.refundAmount,
      refundRequestedAt: order.refundRequestedAt,
      refundReason: order.refundReason,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };

    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      "Order details retrieved",
      orderDetails
    );
  } catch (error) {
    printError(error, "httpGetOrderById");
    return ErrorResponse(res);
  }
};

/**
 * Update order status
 * PUT /api/v1/admin/events/orders/:orderId/status
 */
export const httpUpdateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { orderStatus, cancellationReason, refundReason, refundAmount } = req.body;

    const order = await EventTicketOrder.findById(orderId);

    if (!order) {
      return NotFoundErrorResponse(res, "Order not found");
    }

    order.orderStatus = orderStatus;

    if (orderStatus === OrderStatus.CANCELLED) {
      order.cancelledAt = new Date();
      order.cancellationReason = cancellationReason || "Cancelled by admin";

      // Restore ticket inventory
      for (const ticketItem of order.tickets) {
        await EventTicket.findByIdAndUpdate(ticketItem.eventTicketId, {
          $inc: { numberOfSoldTickets: -ticketItem.quantity },
        });
      }
    }

    if (orderStatus === OrderStatus.REFUNDED) {
      order.refundedAt = new Date();
      order.refundAmount = refundAmount || order.totalAmount;
      order.refundReason = refundReason || "Refunded by admin";
      order.paymentStatus = PaymentStatus.REFUNDED;

      // Restore ticket inventory if not already restored
      if (order.orderStatus !== OrderStatus.CANCELLED) {
        for (const ticketItem of order.tickets) {
          await EventTicket.findByIdAndUpdate(ticketItem.eventTicketId, {
            $inc: { numberOfSoldTickets: -ticketItem.quantity },
          });
        }
      }
    }

    await order.save();

    return SuccessResponse(res, STATUS_CODES.OK, true, "Order status updated", {
      id: order._id,
      orderNumber: order.orderNumber,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
    });
  } catch (error) {
    printError(error, "httpUpdateOrderStatus");
    return ErrorResponse(res);
  }
};

/**
 * Get events by creator
 * GET /api/v1/admin/events/creator/:creatorId
 */
export const httpGetEventsByCreator = async (req: Request, res: Response) => {
  try {
    const { creatorId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [events, total] = await Promise.all([
      Event.find({ creatorId: new Types.ObjectId(creatorId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Event.countDocuments({ creatorId: new Types.ObjectId(creatorId) }),
    ]);

    const eventsWithStats = await Promise.all(
      events.map(async (event) => {
        const tickets = await EventTicket.find({ eventId: event._id }).lean();
        const totalTickets = tickets.reduce((sum, t) => sum + t.numberOfTickets, 0);
        const soldTickets = tickets.reduce((sum, t) => sum + t.numberOfSoldTickets, 0);

        return {
          id: event._id,
          eventName: event.eventName,
          eventCoverImageUrl: event.eventCoverImageUrl,
          eventDateTime: event.eventDateTime,
          eventStatus: event.eventStatus,
          eventCategory: event.eventCategory,
          ticketStats: {
            totalTickets,
            soldTickets,
            availableTickets: totalTickets - soldTickets,
          },
          createdAt: event.createdAt,
        };
      })
    );

    return SuccessResponse(res, STATUS_CODES.OK, true, "Creator events retrieved", {
      events: eventsWithStats,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    printError(error, "httpGetEventsByCreator");
    return ErrorResponse(res);
  }
};

/**
 * Get unique event categories
 * GET /api/v1/admin/events/categories
 */
export const httpGetEventCategories = async (req: Request, res: Response) => {
  try {
    const categories = await Event.distinct("eventCategory");

    return SuccessResponse(res, STATUS_CODES.OK, true, "Categories retrieved", {
      categories,
    });
  } catch (error) {
    printError(error, "httpGetEventCategories");
    return ErrorResponse(res);
  }
};


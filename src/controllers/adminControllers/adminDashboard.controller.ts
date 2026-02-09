import type { Request, Response } from "express";
import { STATUS_CODES } from "../../constants/statusCodes";
import {
  ErrorResponse,
  SuccessResponse,
  printError,
} from "../../utils/responseHandler";
import UserModel from "../../models/user/user.schema";
import { Event as EventModel } from "../../models/event/event.schema";
import { EventTicketOrder } from "../../models/event/eventTicketOrder.schema";
import { OrderStatus, PaymentStatus } from "../../models/event/event.types";

/**
 * Get dashboard statistics
 * GET /api/v1/admin/dashboard/stats
 */
export const httpGetDashboardStats = async (req: Request, res: Response) => {
  try {
    // Get current date and date 30 days ago for growth calculation
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      usersLastMonth,
      totalRevenue,
      revenueLastMonth,
      activeOrders,
      totalEvents,
    ] = await Promise.all([
      // Total users (not deleted)
      UserModel.countDocuments({ isDeleted: false }),

      // Users created in last 30 days
      UserModel.countDocuments({
        isDeleted: false,
        createdAt: { $gte: thirtyDaysAgo },
      }),

      // Total revenue from confirmed orders
      EventTicketOrder.aggregate([
        {
          $match: {
            paymentStatus: PaymentStatus.COMPLETED,
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$totalAmount" },
          },
        },
      ]),

      // Revenue from last 30 days
      EventTicketOrder.aggregate([
        {
          $match: {
            paymentStatus: PaymentStatus.COMPLETED,
            createdAt: { $gte: thirtyDaysAgo },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$totalAmount" },
          },
        },
      ]),

      // Active orders (confirmed)
      EventTicketOrder.countDocuments({
        orderStatus: OrderStatus.CONFIRMED,
      }),

      // Total events
      EventModel.countDocuments(),
    ]);

    const revenue = totalRevenue[0]?.total || 0;
    const revenueThisMonth = revenueLastMonth[0]?.total || 0;

    // Calculate growth percentages
    const userGrowth = usersLastMonth > 0 ? ((usersLastMonth / totalUsers) * 100).toFixed(1) : "0";
    const revenueGrowth = revenueThisMonth > 0 && revenue > 0
      ? (((revenueThisMonth / revenue) * 100)).toFixed(1)
      : "0";

    const stats = {
      totalUsers,
      newUsersThisMonth: usersLastMonth,
      userGrowth: `+${userGrowth}%`,
      totalRevenue: revenue,
      revenueThisMonth,
      revenueGrowth: `+${revenueGrowth}%`,
      activeOrders,
      totalEvents,
    };

    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      "Dashboard stats retrieved successfully",
      stats
    );
  } catch (error) {
    printError(error, "httpGetDashboardStats");
    return ErrorResponse(res);
  }
};

/**
 * Get recent transactions
 * GET /api/v1/admin/dashboard/transactions
 */
export const httpGetRecentTransactions = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    const transactions = await EventTicketOrder.find()
      .populate("userId", "username email displayName")
      .populate("eventId", "eventName eventDateTime")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const formattedTransactions = transactions.map((transaction) => ({
      id: transaction._id,
      orderNumber: transaction.orderNumber,
      user: transaction.userId,
      event: transaction.eventId,
      amount: transaction.totalAmount,
      currency: transaction.currency,
      orderStatus: transaction.orderStatus,
      paymentStatus: transaction.paymentStatus,
      createdAt: transaction.createdAt,
    }));

    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      "Recent transactions retrieved successfully",
      formattedTransactions
    );
  } catch (error) {
    printError(error, "httpGetRecentTransactions");
    return ErrorResponse(res);
  }
};

/**
 * Get user statistics for admin panel
 * GET /api/v1/admin/dashboard/users/stats
 */
export const httpGetUserStats = async (req: Request, res: Response) => {
  try {
    const [totalUsers, activeUsers, suspendedUsers, deletedUsers] = await Promise.all([
      UserModel.countDocuments({ isDeleted: false }),
      UserModel.countDocuments({ isDeleted: false, verified: true }),
      UserModel.countDocuments({ isDeleted: false, verified: false }),
      UserModel.countDocuments({ isDeleted: true }),
    ]);

    const stats = {
      totalUsers,
      activeUsers,
      suspendedUsers,
      deletedUsers,
    };

    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      "User stats retrieved successfully",
      stats
    );
  } catch (error) {
    printError(error, "httpGetUserStats");
    return ErrorResponse(res);
  }
};

/**
 * Get all users with pagination and filters
 * GET /api/v1/admin/dashboard/users
 */
export const httpGetAllUsers = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const membership = req.query.membership as string;
    const verified = req.query.verified as string;

    const query: any = {};

    // Search by username, email, or displayName
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { displayName: { $regex: search, $options: "i" } },
      ];
    }

    if (membership) {
      query.membership = membership;
    }

    if (verified !== undefined) {
      query.verified = verified === "true";
    }

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      UserModel.find(query)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      UserModel.countDocuments(query),
    ]);

    const formattedUsers = users.map((user) => ({
      id: user._id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      profilePicture: user.profilePicture,
      membership: user.membership,
      verified: user.verified,
      isDeleted: user.isDeleted,
      lastLogin: user.lastLogin,
      createdAt: (user as any).createdAt,
    }));

    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      "Users retrieved successfully",
      {
        users: formattedUsers,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      }
    );
  } catch (error) {
    printError(error, "httpGetAllUsers");
    return ErrorResponse(res);
  }
};

/**
 * Get event statistics for admin panel
 * GET /api/v1/admin/dashboard/events/stats
 */
export const httpGetEventStats = async (req: Request, res: Response) => {
  try {
    const now = new Date();

    const [totalEvents, upcomingEvents, completedEvents, totalRevenue] = await Promise.all([
      EventModel.countDocuments(),
      EventModel.countDocuments({ eventDateTime: { $gte: now }, eventStatus: "scheduled" }),
      EventModel.countDocuments({ eventDateTime: { $lt: now } }),
      EventTicketOrder.aggregate([
        {
          $match: {
            paymentStatus: PaymentStatus.COMPLETED,
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$totalAmount" },
          },
        },
      ]),
    ]);

    const stats = {
      totalEvents,
      upcomingEvents,
      completedEvents,
      totalRevenue: totalRevenue[0]?.total || 0,
    };

    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      "Event stats retrieved successfully",
      stats
    );
  } catch (error) {
    printError(error, "httpGetEventStats");
    return ErrorResponse(res);
  }
};

/**
 * Get all events with pagination and filters
 * GET /api/v1/admin/dashboard/events
 */
export const httpGetAllEvents = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const status = req.query.status as string;
    const category = req.query.category as string;

    const query: any = {};

    if (search) {
      query.$or = [
        { eventName: { $regex: search, $options: "i" } },
        { eventDescription: { $regex: search, $options: "i" } },
      ];
    }

    if (status) {
      query.eventStatus = status;
    }

    if (category) {
      query.eventCategory = category;
    }

    const skip = (page - 1) * limit;
    const [events, total] = await Promise.all([
      EventModel.find(query)
        .populate("creatorId", "username displayName email")
        .sort({ eventDateTime: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      EventModel.countDocuments(query),
    ]);

    // Get ticket sales for each event
    const eventsWithStats = await Promise.all(
      events.map(async (event: any) => {
        const [ticketStats] = await EventTicketOrder.aggregate([
          {
            $match: {
              eventId: event._id,
              orderStatus: { $in: [OrderStatus.CONFIRMED, OrderStatus.PENDING] },
            },
          },
          {
            $group: {
              _id: null,
              totalTickets: { $sum: { $sum: "$tickets.quantity" } },
              totalRevenue: {
                $sum: {
                  $cond: [
                    { $eq: ["$paymentStatus", PaymentStatus.COMPLETED] },
                    "$totalAmount",
                    0,
                  ],
                },
              },
            },
          },
        ]);

        return {
          id: event._id,
          eventName: event.eventName,
          creator: event.creatorId,
          eventDateTime: event.eventDateTime,
          eventLocation: event.eventLocation,
          eventCategory: event.eventCategory,
          eventStatus: event.eventStatus,
          eventCoverImageUrl: event.eventCoverImageUrl,
          ticketsSold: ticketStats?.totalTickets || 0,
          revenue: ticketStats?.totalRevenue || 0,
          createdAt: event.createdAt,
        };
      })
    );

    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      "Events retrieved successfully",
      {
        events: eventsWithStats,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      }
    );
  } catch (error) {
    printError(error, "httpGetAllEvents");
    return ErrorResponse(res);
  }
};

/**
 * Get ticket statistics for admin panel
 * GET /api/v1/admin/dashboard/tickets/stats
 */
export const httpGetTicketStats = async (req: Request, res: Response) => {
  try {
    const [totalTickets, validTickets, usedTickets, totalRevenue] = await Promise.all([
      EventTicketOrder.aggregate([
        {
          $match: {
            orderStatus: { $in: [OrderStatus.CONFIRMED, OrderStatus.PENDING] },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: { $sum: "$tickets.quantity" } },
          },
        },
      ]),
      EventTicketOrder.countDocuments({
        orderStatus: OrderStatus.CONFIRMED,
      }),
      EventTicketOrder.countDocuments({
        orderStatus: OrderStatus.CONFIRMED,
        // You might want to add a "used" field to track this
      }),
      EventTicketOrder.aggregate([
        {
          $match: {
            paymentStatus: PaymentStatus.COMPLETED,
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$totalAmount" },
          },
        },
      ]),
    ]);

    const stats = {
      totalTickets: totalTickets[0]?.total || 0,
      validTickets,
      usedTickets, // Same as validTickets for now
      totalRevenue: totalRevenue[0]?.total || 0,
    };

    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      "Ticket stats retrieved successfully",
      stats
    );
  } catch (error) {
    printError(error, "httpGetTicketStats");
    return ErrorResponse(res);
  }
};

/**
 * Get all tickets with pagination and filters
 * GET /api/v1/admin/dashboard/tickets
 */
export const httpGetAllTickets = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const orderStatus = req.query.orderStatus as string;
    const paymentStatus = req.query.paymentStatus as string;

    const query: any = {};

    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: "i" } },
        { attendeeEmail: { $regex: search, $options: "i" } },
        { attendeeName: { $regex: search, $options: "i" } },
      ];
    }

    if (orderStatus) {
      query.orderStatus = orderStatus;
    }

    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    const skip = (page - 1) * limit;
    const [tickets, total] = await Promise.all([
      EventTicketOrder.find(query)
        .populate("userId", "username displayName email")
        .populate("eventId", "eventName eventDateTime")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      EventTicketOrder.countDocuments(query),
    ]);

    const formattedTickets = tickets.map((ticket) => ({
      id: ticket._id,
      orderNumber: ticket.orderNumber,
      event: ticket.eventId,
      customer: ticket.userId,
      attendeeName: ticket.attendeeName,
      attendeeEmail: ticket.attendeeEmail,
      tickets: ticket.tickets,
      totalAmount: ticket.totalAmount,
      currency: ticket.currency,
      orderStatus: ticket.orderStatus,
      paymentStatus: ticket.paymentStatus,
      createdAt: ticket.createdAt,
    }));

    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      "Tickets retrieved successfully",
      {
        tickets: formattedTickets,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      }
    );
  } catch (error) {
    printError(error, "httpGetAllTickets");
    return ErrorResponse(res);
  }
};

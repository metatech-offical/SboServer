import { Types, ClientSession } from "mongoose";
import { Event } from "../../models/event/event.schema";
import { EventTicket } from "../../models/event/eventTicket.schema";
import { EventTicketOrder } from "../../models/event/eventTicketOrder.schema";
import { STATUS_CODES } from "../../constants/statusCodes";
import { ResultDB } from "../../utils/responseHandler";
import { TICKET_ORDER_MESSAGES } from "../../constants/responseMessage";
import {
  OrderStatus,
  PaymentStatus,
  EventStatus,
  TicketStatus,
} from "../../models/event/event.types";
import mongoose from "mongoose";

interface CreateOrderTicketItem {
  eventTicketId: string;
  quantity: number;
}

interface CreateOrderData {
  userId: Types.ObjectId;
  eventId: string;
  tickets: CreateOrderTicketItem[];
  attendeeEmail: string;
  attendeeName: string;
  attendeePhone?: string;
}

// Generate unique order number
const generateOrderNumber = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD-${timestamp}-${random}`;
};

// Create ticket order with inventory management
export const createTicketOrder = async (orderData: CreateOrderData) => {
  const session: ClientSession = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userId, eventId, tickets, attendeeEmail, attendeeName, attendeePhone } = orderData;

    // Validate event exists and is available
    const event = await Event.findById(eventId).session(session);
    if (!event) {
      await session.abortTransaction();
      return ResultDB(
        STATUS_CODES.NOT_FOUND,
        false,
        TICKET_ORDER_MESSAGES.EVENT_NOT_AVAILABLE,
        null
      );
    }

    // Check if event is cancelled
    if (event.eventStatus === EventStatus.CANCELLED) {
      await session.abortTransaction();
      return ResultDB(
        STATUS_CODES.BAD_REQUEST,
        false,
        TICKET_ORDER_MESSAGES.EVENT_CANCELLED,
        null
      );
    }

    // Check if event is in the past
    if (event.eventDateTime < new Date()) {
      await session.abortTransaction();
      return ResultDB(
        STATUS_CODES.BAD_REQUEST,
        false,
        TICKET_ORDER_MESSAGES.EVENT_PAST,
        null
      );
    }

    // Validate all tickets and check availability
    const ticketIds = tickets.map((t) => new Types.ObjectId(t.eventTicketId));
    const eventTickets = await EventTicket.find({
      _id: { $in: ticketIds },
      eventId: event._id,
    }).session(session);

    if (eventTickets.length !== tickets.length) {
      await session.abortTransaction();
      return ResultDB(
        STATUS_CODES.BAD_REQUEST,
        false,
        TICKET_ORDER_MESSAGES.INVALID_TICKET,
        null
      );
    }

    // Create a map for quick lookup
    const ticketMap = new Map(eventTickets.map((t) => [t._id.toString(), t]));

    // Calculate total quantity and validate availability
    let totalQuantity = 0;
    const orderTickets = [];

    for (const ticketItem of tickets) {
      const ticket = ticketMap.get(ticketItem.eventTicketId);
      if (!ticket) {
        await session.abortTransaction();
        return ResultDB(
          STATUS_CODES.BAD_REQUEST,
          false,
          TICKET_ORDER_MESSAGES.INVALID_TICKET,
          null
        );
      }

      // Check if ticket is sold out
      if (ticket.ticketStatus === TicketStatus.SOLD_OUT) {
        await session.abortTransaction();
        return ResultDB(
          STATUS_CODES.BAD_REQUEST,
          false,
          `${ticket.ticketName} is sold out`,
          null
        );
      }

      // Check available quantity
      const availableQuantity = ticket.numberOfTickets - ticket.numberOfSoldTickets;
      if (ticketItem.quantity > availableQuantity) {
        await session.abortTransaction();
        return ResultDB(
          STATUS_CODES.BAD_REQUEST,
          false,
          `Only ${availableQuantity} tickets available for ${ticket.ticketName}`,
          null
        );
      }

      // Validate quantity
      if (ticketItem.quantity <= 0) {
        await session.abortTransaction();
        return ResultDB(
          STATUS_CODES.BAD_REQUEST,
          false,
          TICKET_ORDER_MESSAGES.INVALID_QUANTITY,
          null
        );
      }

      totalQuantity += ticketItem.quantity;

      const subtotal = ticket.originalPrice * ticketItem.quantity;
      orderTickets.push({
        eventTicketId: ticket._id,
        ticketName: ticket.ticketName,
        price: ticket.originalPrice,
        quantity: ticketItem.quantity,
        subtotal,
      });
    }

    // Check per-user ticket limit (0 means unlimited)
    if (event.eventLimitPerUser > 0) {
      // Get existing orders for this user and event
      const existingOrders = await EventTicketOrder.find({
        userId,
        eventId: event._id,
        orderStatus: { $in: [OrderStatus.CONFIRMED, OrderStatus.PENDING] },
      }).session(session);

      const totalPurchasedTickets = existingOrders.reduce((sum, order) => {
        return (
          sum +
          order.tickets.reduce((ticketSum, ticket) => ticketSum + ticket.quantity, 0)
        );
      }, 0);

      if (totalPurchasedTickets + totalQuantity > event.eventLimitPerUser) {
        await session.abortTransaction();
        return ResultDB(
          STATUS_CODES.BAD_REQUEST,
          false,
          `You can only purchase up to ${event.eventLimitPerUser} tickets for this event. You have already purchased ${totalPurchasedTickets} tickets.`,
          null
        );
      }
    }

    // Atomically update ticket inventory using optimistic locking
    // This prevents race conditions when multiple users book simultaneously
    for (const ticketItem of tickets) {
      const ticket = ticketMap.get(ticketItem.eventTicketId)!;

      // Atomic operation: only update if current soldTickets + new quantity <= total tickets
      // This ensures we never oversell even with concurrent requests
      const updateResult = await EventTicket.findOneAndUpdate(
        {
          _id: new Types.ObjectId(ticketItem.eventTicketId),
          // Critical: This check happens atomically in MongoDB
          $expr: {
            $lte: [
              { $add: ["$numberOfSoldTickets", ticketItem.quantity] },
              "$numberOfTickets"
            ]
          }
        },
        {
          $inc: { numberOfSoldTickets: ticketItem.quantity },
        },
        { session, new: true }
      );

      // If update fails, it means another transaction took the last tickets
      if (!updateResult) {
        await session.abortTransaction();
        return ResultDB(
          STATUS_CODES.CONFLICT,
          false,
          `Failed to reserve tickets for ${ticket.ticketName}. They may have just been sold out.`,
          null
        );
      }
    }

    // Calculate total amount
    const totalAmount = orderTickets.reduce((sum, ticket) => sum + ticket.subtotal, 0);

    // Create the order (confirmed immediately since we're not handling payment yet)
    const order = await EventTicketOrder.create(
      [
        {
          userId,
          eventId: event._id,
          orderNumber: generateOrderNumber(),
          tickets: orderTickets,
          totalAmount,
          currency: event.eventCurrencyType,
          orderStatus: OrderStatus.CONFIRMED,
          paymentStatus: PaymentStatus.COMPLETED,
          attendeeEmail,
          attendeeName,
          attendeePhone,
          qrCode: `QR-${generateOrderNumber()}`, // Simplified QR code
        },
      ],
      { session }
    );

    await session.commitTransaction();

    // Populate event and user details
    const populatedOrder = await EventTicketOrder.findById(order[0]._id)
      .populate("eventId", "eventName eventDateTime eventLocation eventCoverImageUrl")
      .populate("userId", "name email")
      .lean();

    return ResultDB(
      STATUS_CODES.CREATED,
      true,
      TICKET_ORDER_MESSAGES.ORDER_CREATED,
      populatedOrder
    );
  } catch (err) {
    await session.abortTransaction();
    console.error("Error creating ticket order:", err);
    return ResultDB(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      TICKET_ORDER_MESSAGES.INTERNAL_ERROR,
      null
    );
  } finally {
    session.endSession();
  }
};

// Get user's orders
export const getUserOrders = async (
  userId: Types.ObjectId,
  query: {
    status?: OrderStatus;
    page?: number;
    limit?: number;
  }
) => {
  try {
    const { status, page = 1, limit = 10 } = query;

    const filter: any = { userId };

    if (status) {
      filter.orderStatus = status;
    }

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      EventTicketOrder.find(filter)
        .populate("eventId", "eventName eventDateTime eventLocation eventCoverImageUrl eventStatus")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      EventTicketOrder.countDocuments(filter),
    ]);

    return ResultDB(STATUS_CODES.OK, true, TICKET_ORDER_MESSAGES.ORDERS_FETCHED, {
      orders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    return ResultDB(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      TICKET_ORDER_MESSAGES.INTERNAL_ERROR,
      null
    );
  }
};

// Get order by ID
export const getOrderById = async (orderId: Types.ObjectId, userId: Types.ObjectId) => {
  try {
    const order = await EventTicketOrder.findOne({
      _id: orderId,
      userId,
    })
      .populate("eventId", "eventName eventDateTime eventLocation eventCoverImageUrl eventStatus eventCategory")
      .populate("userId", "name email")
      .lean();

    if (!order) {
      return ResultDB(
        STATUS_CODES.NOT_FOUND,
        false,
        TICKET_ORDER_MESSAGES.ORDER_NOT_FOUND,
        null
      );
    }

    return ResultDB(STATUS_CODES.OK, true, TICKET_ORDER_MESSAGES.ORDER_FETCHED, order);
  } catch (err) {
    return ResultDB(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      TICKET_ORDER_MESSAGES.INTERNAL_ERROR,
      null
    );
  }
};

// Get orders by event (for creators)
export const getOrdersByEvent = async (
  eventId: Types.ObjectId,
  creatorId: Types.ObjectId,
  query: {
    status?: OrderStatus;
    page?: number;
    limit?: number;
  }
) => {
  try {
    // Verify event belongs to creator
    const event = await Event.findOne({ _id: eventId, creatorId });
    if (!event) {
      return ResultDB(
        STATUS_CODES.FORBIDDEN,
        false,
        "You don't have access to this event's orders",
        null
      );
    }

    const { status, page = 1, limit = 10 } = query;

    const filter: any = { eventId };

    if (status) {
      filter.orderStatus = status;
    }

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      EventTicketOrder.find(filter)
        .populate("userId", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      EventTicketOrder.countDocuments(filter),
    ]);

    // Calculate statistics
    const stats = await EventTicketOrder.aggregate([
      { $match: { eventId: new Types.ObjectId(eventId.toString()) } },
      {
        $group: {
          _id: "$orderStatus",
          count: { $sum: 1 },
          totalRevenue: { $sum: "$totalAmount" },
        },
      },
    ]);

    return ResultDB(STATUS_CODES.OK, true, TICKET_ORDER_MESSAGES.ORDERS_FETCHED, {
      orders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      statistics: stats,
    });
  } catch (err) {
    return ResultDB(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      TICKET_ORDER_MESSAGES.INTERNAL_ERROR,
      null
    );
  }
};

// Cancel order
export const cancelOrder = async (
  orderId: Types.ObjectId,
  userId: Types.ObjectId,
  cancellationReason?: string
) => {
  const session: ClientSession = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await EventTicketOrder.findOne({
      _id: orderId,
      userId,
    }).session(session);

    if (!order) {
      await session.abortTransaction();
      return ResultDB(
        STATUS_CODES.NOT_FOUND,
        false,
        TICKET_ORDER_MESSAGES.ORDER_NOT_FOUND,
        null
      );
    }

    // Check if order can be cancelled
    if (order.orderStatus === OrderStatus.CANCELLED) {
      await session.abortTransaction();
      return ResultDB(
        STATUS_CODES.BAD_REQUEST,
        false,
        TICKET_ORDER_MESSAGES.ALREADY_CANCELLED,
        null
      );
    }

    if (order.orderStatus === OrderStatus.REFUNDED) {
      await session.abortTransaction();
      return ResultDB(
        STATUS_CODES.BAD_REQUEST,
        false,
        TICKET_ORDER_MESSAGES.ALREADY_REFUNDED,
        null
      );
    }

    // Restore ticket inventory
    for (const ticket of order.tickets) {
      await EventTicket.findByIdAndUpdate(
        ticket.eventTicketId,
        {
          $inc: { numberOfSoldTickets: -ticket.quantity },
        },
        { session }
      );
    }

    // Update order status
    order.orderStatus = OrderStatus.CANCELLED;
    order.cancelledAt = new Date();
    order.cancellationReason = cancellationReason || "Cancelled by user";
    await order.save({ session });

    await session.commitTransaction();

    return ResultDB(
      STATUS_CODES.OK,
      true,
      TICKET_ORDER_MESSAGES.ORDER_CANCELLED,
      order
    );
  } catch (err) {
    await session.abortTransaction();
    return ResultDB(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      TICKET_ORDER_MESSAGES.INTERNAL_ERROR,
      null
    );
  } finally {
    session.endSession();
  }
};

// Confirm order (after payment)
export const confirmOrder = async (
  orderId: Types.ObjectId,
  paymentData: {
    paymentMethod: string;
    paymentTransactionId: string;
  }
) => {
  try {
    const order = await EventTicketOrder.findById(orderId);

    if (!order) {
      return ResultDB(
        STATUS_CODES.NOT_FOUND,
        false,
        TICKET_ORDER_MESSAGES.ORDER_NOT_FOUND,
        null
      );
    }

    if (order.orderStatus === OrderStatus.CONFIRMED) {
      return ResultDB(STATUS_CODES.OK, true, "Order already confirmed", order);
    }

    if (order.orderStatus !== OrderStatus.PENDING) {
      return ResultDB(
        STATUS_CODES.BAD_REQUEST,
        false,
        TICKET_ORDER_MESSAGES.INVALID_ORDER,
        null
      );
    }

    // Update order with payment details
    order.orderStatus = OrderStatus.CONFIRMED;
    order.paymentStatus = PaymentStatus.COMPLETED;
    order.paymentMethod = paymentData.paymentMethod;
    order.paymentTransactionId = paymentData.paymentTransactionId;

    // Generate QR code (in production, use a proper QR code generation library)
    order.qrCode = `QR-${order.orderNumber}-${Date.now()}`;

    await order.save();

    const populatedOrder = await EventTicketOrder.findById(order._id)
      .populate("eventId", "eventName eventDateTime eventLocation eventCoverImageUrl")
      .populate("userId", "name email")
      .lean();

    return ResultDB(
      STATUS_CODES.OK,
      true,
      TICKET_ORDER_MESSAGES.ORDER_CONFIRMED,
      populatedOrder
    );
  } catch (err) {
    return ResultDB(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      TICKET_ORDER_MESSAGES.INTERNAL_ERROR,
      null
    );
  }
};

/**
 * Request and automatically process a refund for a ticket order
 * - Validates order can be refunded
 * - Restores ticket inventory
 * - Updates order status to REFUNDED
 * - Sends notification to user and creator
 *
 * TODO: Integrate with Stripe API to process actual payment refunds when payment flow is implemented
 */
export const requestRefund = async (
  orderId: Types.ObjectId,
  userId: Types.ObjectId,
  refundReason?: string
) => {
  const session: ClientSession = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await EventTicketOrder.findOne({
      _id: orderId,
      userId,
    })
      .populate("eventId", "eventName eventDateTime creatorId")
      .populate("userId", "name email")
      .session(session);

    if (!order) {
      await session.abortTransaction();
      return ResultDB(
        STATUS_CODES.NOT_FOUND,
        false,
        TICKET_ORDER_MESSAGES.ORDER_NOT_FOUND,
        null
      );
    }

    // Check if order can be refunded
    if (order.orderStatus === OrderStatus.REFUNDED) {
      await session.abortTransaction();
      return ResultDB(
        STATUS_CODES.BAD_REQUEST,
        false,
        TICKET_ORDER_MESSAGES.ALREADY_REFUNDED,
        null
      );
    }

    if (order.orderStatus === OrderStatus.CANCELLED) {
      await session.abortTransaction();
      return ResultDB(
        STATUS_CODES.BAD_REQUEST,
        false,
        "Cannot refund a cancelled order",
        null
      );
    }

    if (order.orderStatus !== OrderStatus.CONFIRMED && order.orderStatus !== OrderStatus.PENDING) {
      await session.abortTransaction();
      return ResultDB(
        STATUS_CODES.BAD_REQUEST,
        false,
        TICKET_ORDER_MESSAGES.INVALID_ORDER,
        null
      );
    }

    // Check if event has already passed
    const event: any = order.eventId;
    if (event.eventDateTime < new Date()) {
      await session.abortTransaction();
      return ResultDB(
        STATUS_CODES.BAD_REQUEST,
        false,
        "Cannot refund tickets for past events",
        null
      );
    }

    // Restore ticket inventory
    for (const ticket of order.tickets) {
      await EventTicket.findByIdAndUpdate(
        ticket.eventTicketId,
        {
          $inc: { numberOfSoldTickets: -ticket.quantity },
        },
        { session }
      );
    }

    // Process refund automatically (as per user request)
    order.orderStatus = OrderStatus.REFUNDED;
    order.paymentStatus = PaymentStatus.REFUNDED;
    order.refundedAt = new Date();
    order.refundAmount = order.totalAmount;
    order.refundReason = refundReason || "Refund requested by user";
    order.refundRequestedAt = new Date();

    await order.save({ session });

    await session.commitTransaction();

    // Send notifications asynchronously
    const user: any = order.userId;
    const { sendNotification } = require("../notificationService/notification.service");
    const { ENotificationType } = require("../../models/notification/notification.types");
    const { sendMail } = require("../../lib/mailer");
    const { REFUND_APPROVED_EMAIL } = require("../../constants/email");

    // Notify user about refund approval
    await sendNotification({
      userId: user._id.toString(),
      senderId: event.creatorId.toString(),
      type: ENotificationType.refundApproved,
      contentId: orderId.toString(),
      contentType: null,
      notificationText: `Your refund request for "${event.eventName}" has been approved. ${order.currency} ${order.refundAmount} will be refunded.`,
      pushNotificationContent: {
        title: "Refund Approved",
        body: `Your refund of ${order.currency} ${order.refundAmount} for ${event.eventName} has been processed`,
      },
    });

    // Send email notification
    const emailContent = REFUND_APPROVED_EMAIL({
      userName: user.name,
      eventName: event.eventName,
      orderNumber: order.orderNumber,
      refundAmount: `${order.currency} ${order.refundAmount}`,
    });

    sendMail(user.email, emailContent.subject, emailContent.html, true);

    // Notify creator about refund request
    await sendNotification({
      userId: event.creatorId.toString(),
      senderId: user._id.toString(),
      type: ENotificationType.refundRequest,
      contentId: orderId.toString(),
      contentType: null,
      notificationText: `Refund processed for "${event.eventName}" - Order #${order.orderNumber}`,
      pushNotificationContent: {
        title: "Refund Processed",
        body: `A refund of ${order.currency} ${order.refundAmount} was processed for ${event.eventName}`,
      },
    });

    // TODO: Process actual Stripe refund here when payment flow is implemented
    // if (order.paymentTransactionId) {
    //   const stripe = require('../../config/stripe').default;
    //   await stripe.refunds.create({
    //     payment_intent: order.paymentTransactionId,
    //     amount: Math.round(order.refundAmount * 100), // Stripe uses cents
    //     reason: 'requested_by_customer',
    //   });
    // }

    return ResultDB(
      STATUS_CODES.OK,
      true,
      "Refund processed successfully",
      order
    );
  } catch (err) {
    await session.abortTransaction();
    console.error("Error processing refund:", err);
    return ResultDB(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      TICKET_ORDER_MESSAGES.INTERNAL_ERROR,
      null
    );
  } finally {
    session.endSession();
  }
};

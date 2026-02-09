import { Types } from "mongoose";
import { Event } from "../../models/event/event.schema";
import { EventTicketOrder } from "../../models/event/eventTicketOrder.schema";
import { STATUS_CODES } from "../../constants/statusCodes";
import { ResultDB } from "../../utils/responseHandler";
import { EVENT_MESSAGES } from "../../constants/responseMessage";
import { EventStatus, OrderStatus } from "../../models/event/event.types";
import { sendNotification } from "../notificationService/notification.service";
import { ENotificationType } from "../../models/notification/notification.types";
import { sendMail } from "../../lib/mailer";
import {
  EVENT_POSTPONED_EMAIL,
  EVENT_CANCELLED_EMAIL,
} from "../../constants/email";
import { EventTicket } from "../../models/event/eventTicket.schema";
import mongoose from "mongoose";

interface PostponeEventData {
  newDateTime: Date;
  reason?: string;
}

/**
 * Postpone an event to a new date/time
 * - Updates event status to POSTPONED
 * - Stores postponement history
 * - Notifies all ticket holders via in-app and email
 */
export const postponeEvent = async (
  eventId: Types.ObjectId,
  creatorId: Types.ObjectId,
  data: PostponeEventData
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find the event
    const event = await Event.findById(eventId).session(session);

    if (!event) {
      await session.abortTransaction();
      session.endSession();
      return ResultDB(
        STATUS_CODES.NOT_FOUND,
        false,
        EVENT_MESSAGES.NOT_FOUND,
        null
      );
    }

    // Verify the event belongs to the creator
    if (event.creatorId.toString() !== creatorId.toString()) {
      await session.abortTransaction();
      session.endSession();
      return ResultDB(
        STATUS_CODES.FORBIDDEN,
        false,
        EVENT_MESSAGES.INVALID_CREATOR,
        null
      );
    }

    // Validate new date is in the future
    if (data.newDateTime <= new Date()) {
      await session.abortTransaction();
      session.endSession();
      return ResultDB(
        STATUS_CODES.BAD_REQUEST,
        false,
        "New event date must be in the future",
        null
      );
    }

    // Validate new date is different from current date
    if (data.newDateTime.getTime() === event.eventDateTime.getTime()) {
      await session.abortTransaction();
      session.endSession();
      return ResultDB(
        STATUS_CODES.BAD_REQUEST,
        false,
        "New event date must be different from current date",
        null
      );
    }

    // Store the previous date and update to new date
    const previousDateTime = event.eventDateTime;

    event.eventStatus = EventStatus.POSTPONED;
    event.eventDateTime = data.newDateTime;
    event.postponementInfo = {
      previousDateTime,
      newDateTime: data.newDateTime,
      postponedAt: new Date(),
      reason: data.reason,
    };

    await event.save({ session });

    // Get all ticket holders for this event
    const orders = await EventTicketOrder.find({
      eventId,
      orderStatus: { $in: [OrderStatus.CONFIRMED, OrderStatus.PENDING] },
    })
      .populate("userId", "name email")
      .session(session);

    // Commit the transaction before sending notifications
    await session.commitTransaction();
    session.endSession();

    // Send notifications asynchronously (after transaction commit)
    const notificationPromises = orders.map(async (order: any) => {
      const user = order.userId;

      // Format dates for display
      const previousDateStr = previousDateTime.toLocaleString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const newDateStr = data.newDateTime.toLocaleString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      // Send in-app notification
      await sendNotification({
        userId: user._id.toString(),
        senderId: creatorId.toString(),
        type: ENotificationType.eventPostponed,
        contentId: eventId.toString(),
        contentType: null,
        notificationText: `Event "${event.eventName}" has been postponed from ${previousDateStr} to ${newDateStr}`,
        pushNotificationContent: {
          title: "Event Postponed",
          body: `${event.eventName} has been rescheduled to ${newDateStr}`,
        },
      });

      // Send email notification
      const emailContent = EVENT_POSTPONED_EMAIL({
        userName: user.name,
        eventName: event.eventName,
        previousDate: previousDateStr,
        newDate: newDateStr,
        reason: data.reason,
      });

      sendMail(user.email, emailContent.subject, emailContent.html, true);
    });

    await Promise.all(notificationPromises);

    return ResultDB(
      STATUS_CODES.OK,
      true,
      EVENT_MESSAGES.POSTPONED,
      {
        event,
        notifiedUsers: orders.length,
      }
    );
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error postponing event:", err);
    return ResultDB(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      EVENT_MESSAGES.INTERNAL_ERROR,
      null
    );
  }
};

interface CancelEventData {
  reason?: string;
}

/**
 * Cancel an event
 * - Updates event status to CANCELLED
 * - Stores cancellation info
 * - Automatically processes refunds for all tickets
 * - Restores ticket inventory
 * - Notifies all ticket holders via in-app and email
 *
 * TODO: Integrate with Stripe API to process actual payment refunds when payment flow is implemented
 */
export const cancelEvent = async (
  eventId: Types.ObjectId,
  creatorId: Types.ObjectId,
  data: CancelEventData
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find the event
    const event = await Event.findById(eventId).session(session);

    if (!event) {
      await session.abortTransaction();
      session.endSession();
      return ResultDB(
        STATUS_CODES.NOT_FOUND,
        false,
        EVENT_MESSAGES.NOT_FOUND,
        null
      );
    }

    // Verify the event belongs to the creator
    if (event.creatorId.toString() !== creatorId.toString()) {
      await session.abortTransaction();
      session.endSession();
      return ResultDB(
        STATUS_CODES.FORBIDDEN,
        false,
        EVENT_MESSAGES.INVALID_CREATOR,
        null
      );
    }

    // Check if event is already cancelled
    if (event.eventStatus === EventStatus.CANCELLED) {
      await session.abortTransaction();
      session.endSession();
      return ResultDB(
        STATUS_CODES.BAD_REQUEST,
        false,
        "Event is already cancelled",
        null
      );
    }

    // Update event status to cancelled
    event.eventStatus = EventStatus.CANCELLED;
    event.cancellationInfo = {
      cancelledAt: new Date(),
      reason: data.reason,
    };

    await event.save({ session });

    // Get all ticket holders for this event (confirmed and pending orders)
    const orders = await EventTicketOrder.find({
      eventId,
      orderStatus: { $in: [OrderStatus.CONFIRMED, OrderStatus.PENDING] },
    })
      .populate("userId", "name email")
      .session(session);

    // Process refunds for all orders
    const refundPromises = orders.map(async (order) => {
      // Update order status to refunded
      order.orderStatus = OrderStatus.REFUNDED;
      order.refundedAt = new Date();
      order.refundAmount = order.totalAmount;
      order.cancellationReason = `Event cancelled: ${data.reason || "No reason provided"}`;

      await order.save({ session });

      // Restore ticket inventory
      for (const ticketItem of order.tickets) {
        await EventTicket.findByIdAndUpdate(
          ticketItem.eventTicketId,
          {
            $inc: { numberOfSoldTickets: -ticketItem.quantity },
          },
          { session }
        );
      }
    });

    await Promise.all(refundPromises);

    // Commit the transaction before sending notifications
    await session.commitTransaction();
    session.endSession();

    // Send notifications asynchronously (after transaction commit)
    const eventDateStr = event.eventDateTime.toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const notificationPromises = orders.map(async (order: any) => {
      const user = order.userId;

      // Send in-app notification
      await sendNotification({
        userId: user._id.toString(),
        senderId: creatorId.toString(),
        type: ENotificationType.eventCancelled,
        contentId: eventId.toString(),
        contentType: null,
        notificationText: `Event "${event.eventName}" scheduled for ${eventDateStr} has been cancelled. A refund has been processed.`,
        pushNotificationContent: {
          title: "Event Cancelled",
          body: `${event.eventName} has been cancelled. You will receive a full refund.`,
        },
      });

      // Send email notification
      const emailContent = EVENT_CANCELLED_EMAIL({
        userName: user.name,
        eventName: event.eventName,
        eventDate: eventDateStr,
        reason: data.reason,
      });

      sendMail(user.email, emailContent.subject, emailContent.html, true);
    });

    await Promise.all(notificationPromises);

    // TODO: Process actual Stripe refunds here when payment flow is implemented
    // Example:
    // for (const order of orders) {
    //   if (order.paymentTransactionId) {
    //     await stripe.refunds.create({
    //       payment_intent: order.paymentTransactionId,
    //       amount: order.totalAmount * 100, // Stripe uses cents
    //     });
    //   }
    // }

    return ResultDB(
      STATUS_CODES.OK,
      true,
      EVENT_MESSAGES.CANCELLED,
      {
        event,
        refundedOrders: orders.length,
        totalRefundAmount: orders.reduce((sum, order) => sum + order.totalAmount, 0),
      }
    );
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error cancelling event:", err);
    return ResultDB(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      EVENT_MESSAGES.INTERNAL_ERROR,
      null
    );
  }
};

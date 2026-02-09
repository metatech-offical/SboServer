import { Schema, model } from "mongoose";
import { IEventTicketOrder, OrderStatus, PaymentStatus } from "./event.types";
import { collectionNames } from "../../constants/collectionNames";

const orderTicketItemSchema = new Schema(
  {
    eventTicketId: {
      type: Schema.Types.ObjectId,
      ref: collectionNames.EVENT_TICKET,
      required: true,
    },
    ticketName: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const eventTicketOrderSchema = new Schema<IEventTicketOrder>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: collectionNames.USER,
      required: true,
      index: true,
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: collectionNames.EVENT,
      required: true,
      index: true,
    },
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true,
    },
    tickets: {
      type: [orderTicketItemSchema],
      required: true,
      validate: {
        validator: function (tickets: any[]) {
          return tickets && tickets.length > 0;
        },
        message: "Order must contain at least one ticket",
      },
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      default: "USD",
    },
    orderStatus: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.PENDING,
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
      index: true,
    },
    paymentMethod: {
      type: String,
      trim: true,
    },
    paymentTransactionId: {
      type: String,
      trim: true,
      index: true,
    },
    qrCode: {
      type: String,
      trim: true,
    },
    attendeeEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      // Automatically populated from authenticated user's email
    },
    attendeeName: {
      type: String,
      required: true,
      trim: true,
      // Automatically populated from authenticated user's name
    },
    attendeePhone: {
      type: String,
      trim: true,
    },
    cancelledAt: {
      type: Date,
    },
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    refundedAt: {
      type: Date,
    },
    refundAmount: {
      type: Number,
      min: 0,
    },
    refundRequestedAt: {
      type: Date,
    },
    refundReason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common queries
eventTicketOrderSchema.index({ userId: 1, orderStatus: 1 });
eventTicketOrderSchema.index({ eventId: 1, orderStatus: 1 });
eventTicketOrderSchema.index({ userId: 1, eventId: 1 });
eventTicketOrderSchema.index({ createdAt: -1 });

// Pre-save middleware to calculate totalAmount from tickets
eventTicketOrderSchema.pre("save", function (next) {
  if (this.tickets && this.tickets.length > 0) {
    this.totalAmount = this.tickets.reduce((sum, ticket) => sum + ticket.subtotal, 0);
  }
  next();
});

// Pre-save middleware to set cancelled/refunded timestamps
eventTicketOrderSchema.pre("save", function (next) {
  if (this.isModified("orderStatus")) {
    if (this.orderStatus === OrderStatus.CANCELLED && !this.cancelledAt) {
      this.cancelledAt = new Date();
    }
    if (this.orderStatus === OrderStatus.REFUND_REQUESTED && !this.refundRequestedAt) {
      this.refundRequestedAt = new Date();
    }
    if (this.orderStatus === OrderStatus.REFUNDED && !this.refundedAt) {
      this.refundedAt = new Date();
      if (!this.refundAmount) {
        this.refundAmount = this.totalAmount;
      }
    }
  }
  next();
});

export const EventTicketOrder = model<IEventTicketOrder>(
  collectionNames.EVENT_TICKET_ORDER,
  eventTicketOrderSchema
);

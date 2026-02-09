import type { Document, Types } from "mongoose";

export enum EventStatus {
  SCHEDULED = "scheduled",
  CANCELLED = "cancelled",
  POSTPONED = "postponed",
}

export enum TicketStatus {
  AVAILABLE = "available",
  PAUSED = "sale_paused",
  SOLD_OUT = "sold_out",
}

export enum OrderStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  CANCELLED = "cancelled",
  REFUNDED = "refunded",
  REFUND_REQUESTED = "refund_requested",
  FAILED = "failed",
}

export enum PaymentStatus {
  PENDING = "pending",
  COMPLETED = "completed",
  FAILED = "failed",
  REFUNDED = "refunded",
}

export interface IEventLocation {
  coordinates: {
    lat: number;
    lng: number;
  };
  zipCode: number;
  address: string;
}

export interface IEventPostponementInfo {
  previousDateTime: Date;
  newDateTime: Date;
  postponedAt: Date;
  reason?: string;
}

export interface IEventCancellationInfo {
  cancelledAt: Date;
  reason?: string;
}

export interface IEvent extends Document {
  _id: Types.ObjectId;
  creatorId: Types.ObjectId;
  eventCoverImageUrl: string;
  eventName: string;
  eventDateTime: Date;
  eventPublishOnDate: Date;
  eventDescription: string;
  eventLocation: IEventLocation;
  eventCategory: string;
  eventStatus: EventStatus;
  eventArenaImageUrl?: string;
  eventCurrencyType: string;
  eventLimitPerUser: number;
  lowestTicketPrice?: number;
  postponementInfo?: IEventPostponementInfo;
  cancellationInfo?: IEventCancellationInfo;
  createdAt: Date;
  updatedAt: Date;
}

export interface IEventTicket extends Document {
  _id: Types.ObjectId;
  eventId: Types.ObjectId;
  ticketName: string;
  originalPrice: number;
  numberOfTickets: number;
  numberOfSoldTickets: number;
  ticketStatus: TicketStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOrderTicketItem {
  eventTicketId: Types.ObjectId;
  ticketName: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface IEventTicketOrder extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  eventId: Types.ObjectId;
  orderNumber: string;
  tickets: IOrderTicketItem[];
  totalAmount: number;
  currency: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: string;
  paymentTransactionId?: string;
  qrCode?: string;
  attendeeEmail: string;
  attendeeName: string;
  attendeePhone?: string;
  cancelledAt?: Date;
  cancellationReason?: string;
  refundedAt?: Date;
  refundAmount?: number;
  refundRequestedAt?: Date;
  refundReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

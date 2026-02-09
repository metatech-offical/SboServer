import { Schema, model } from "mongoose";
import { IEvent, EventStatus } from "./event.types";
import { collectionNames } from "../../constants/collectionNames";

const eventLocationSchema = new Schema(
  {
    coordinates: {
      lat: { type: Number, optional: true },
      lng: { type: Number, optional: true },
    },
    zipCode: { type: Number, optional: true },
    address: { type: String, optional: true, trim: true },
  },
  { _id: false }
);

const postponementInfoSchema = new Schema(
  {
    previousDateTime: { type: Date, required: true },
    newDateTime: { type: Date, required: true },
    postponedAt: { type: Date, required: true, default: Date.now },
    reason: { type: String, trim: true },
  },
  { _id: false }
);

const cancellationInfoSchema = new Schema(
  {
    cancelledAt: { type: Date, required: true, default: Date.now },
    reason: { type: String, trim: true },
  },
  { _id: false }
);

const eventSchema = new Schema<IEvent>(
  {
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: collectionNames.USER,
      required: true,
      index: true,
    },
    eventCoverImageUrl: {
      type: String,
      required: true,
      trim: true,
    },
    eventName: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 200,
    },
    eventDateTime: {
      type: Date,
      required: true,
      index: true,
    },
    eventPublishOnDate: {
      type: Date,
      required: true,
    },
    eventDescription: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    eventLocation: {
      type: eventLocationSchema,
      optional: true,
    },
    eventCategory: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    eventStatus: {
      type: String,
      enum: Object.values(EventStatus),
      default: EventStatus.SCHEDULED,
      index: true,
    },
    eventArenaImageUrl: {
      type: String,
      trim: true,
    },
    eventCurrencyType: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      default: "USD",
    },
    eventLimitPerUser: {
      type: Number,
      required: true,
      min: 0,
      default: 5,
    },
    lowestTicketPrice: {
      type: Number,
      optional: true,
      min: 0,
    },
    postponementInfo: {
      type: postponementInfoSchema,
      optional: true,
    },
    cancellationInfo: {
      type: cancellationInfoSchema,
      optional: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common queries
eventSchema.index({ creatorId: 1, eventStatus: 1 });
eventSchema.index({ eventCategory: 1, eventStatus: 1 });
eventSchema.index({ eventDateTime: 1, eventStatus: 1 });

// Index for geospatial queries (future enhancement)
eventSchema.index({ "eventLocation.coordinates.lat": 1, "eventLocation.coordinates.lng": 1 });

export const Event = model<IEvent>(collectionNames.EVENT, eventSchema);

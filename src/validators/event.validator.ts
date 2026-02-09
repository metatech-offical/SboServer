import Joi from "joi";
import { validateMongoObjectId } from "../utils/joiHelper";
import { EventStatus } from "../models/event/event.types";

export const createEventSchema = {
  body: Joi.object({
    eventCoverImageUrl: Joi.string().uri().required(),
    eventName: Joi.string().min(1).max(200).trim().required(),
    eventDateTime: Joi.date().iso().greater("now").required(),
    eventPublishOnDate: Joi.date()
      .iso()
      .less(Joi.ref("eventDateTime"))
      .required()
      .messages({
        "date.less": "eventPublishOnDate must be earlier than eventDateTime",
      }),
    eventDescription: Joi.string().min(1).max(5000).trim().required(),
    eventLocation: Joi.object({
      coordinates: Joi.object({
        lat: Joi.number().min(-90).max(90).optional(),
        lng: Joi.number().min(-180).max(180).optional(),
      }).optional(),
      zipCode: Joi.number().integer().optional(),
      address: Joi.string().min(1).max(500).trim().optional(),
    }).optional(),
    eventCategory: Joi.string().trim().required(),
    eventArenaImageUrl: Joi.string().uri().optional(),
    eventCurrencyType: Joi.string().uppercase().default("USD").optional(),
    eventLimitPerUser: Joi.number().integer().min(0).default(5).optional(),
    tickets: Joi.array()
      .items(
        Joi.object({
          ticketName: Joi.string().min(1).max(100).trim().required(),
          originalPrice: Joi.number().min(0).required(),
          numberOfTickets: Joi.number().integer().min(1).required(),
        })
      )
      .min(1)
      .required(),
  }),
};

export const getEventsSchema = {
  query: Joi.object({
    search: Joi.string().allow("", null).optional(),
    category: Joi.string().optional(),
    status: Joi.string()
      .valid(...Object.values(EventStatus))
      .optional(),
    timeFilter: Joi.string()
      .valid("live", "upcoming", "past")
      .optional(),
    date: Joi.date().iso().optional(),
    city: Joi.string().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(10),
  }),
};

export const getEventByIdSchema = {
  params: Joi.object({
    eventId: Joi.string().custom(validateMongoObjectId).required(),
  }),
};

export const getEventsByCreatorSchema = {
  params: Joi.object({
    creatorId: Joi.string().custom(validateMongoObjectId).required(),
  }),
  query: Joi.object({
    search: Joi.string().allow("", null).optional(),
    category: Joi.string().optional(),
    status: Joi.string()
      .valid(...Object.values(EventStatus))
      .optional(),
    timeFilter: Joi.string()
      .valid("live", "upcoming", "past")
      .optional(),
    date: Joi.date().iso().optional(),
    city: Joi.string().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(10),
  }),
};

export const updateEventSchema = {
  params: Joi.object({
    eventId: Joi.string().custom(validateMongoObjectId).required(),
  }),
  body: Joi.object({
    eventCoverImageUrl: Joi.string().uri().optional(),
    eventName: Joi.string().min(1).max(200).trim().optional(),
    eventDateTime: Joi.date().iso().greater("now").optional(),
    eventPublishOnDate: Joi.date().iso().optional(),
    eventDescription: Joi.string().min(1).max(5000).trim().optional(),
    eventLocation: Joi.object({
      coordinates: Joi.object({
        lat: Joi.number().min(-90).max(90).optional(),
        lng: Joi.number().min(-180).max(180).optional(),
      }).required(),
      zipCode: Joi.number().integer().optional(),
      address: Joi.string().min(1).max(500).trim().optional(),
    }).optional(),
    eventCategory: Joi.string().trim().optional(),
    eventStatus: Joi.string()
      .valid(...Object.values(EventStatus))
      .optional(),
    eventArenaImageUrl: Joi.string().uri().optional(),
    eventCurrencyType: Joi.string().uppercase().optional(),
    eventLimitPerUser: Joi.number().integer().min(0).optional(),
  })
    .min(1) // At least one field must be provided for update
    .custom((value, helpers) => {
      if (
        value.eventDateTime &&
        value.eventPublishOnDate &&
        new Date(value.eventPublishOnDate) >= new Date(value.eventDateTime)
      ) {
        return helpers.error("date.publishBeforeEvent", {
          message: "eventPublishOnDate must be earlier than eventDateTime",
        });
      }
      return value;
    })
    .messages({
      "date.publishBeforeEvent": "eventPublishOnDate must be earlier than eventDateTime",
    }),
};

import Joi from "joi";

import { validateMongoObjectId } from "../utils/joiHelper";
import { OrderStatus } from "../models/event/event.types";

export const createTicketOrderSchema = {
  body: Joi.object({
    eventId: Joi.string().custom(validateMongoObjectId).required(),
    tickets: Joi.array()
      .items(
        Joi.object({
          eventTicketId: Joi.string().custom(validateMongoObjectId).required(),
          quantity: Joi.number().integer().min(1).max(50).required(),
        })
      )
      .min(1)
      .required(),
    // Attendee info is automatically taken from the logged-in user (JWT)
  }),
};

export const getUserOrdersSchema = {
  query: Joi.object({
    status: Joi.string()
      .valid(...Object.values(OrderStatus))
      .optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(10),
  }),
};

export const getOrderByIdSchema = {
  params: Joi.object({
    orderId: Joi.string().custom(validateMongoObjectId).required(),
  }),
};

export const cancelOrderSchema = {
  params: Joi.object({
    orderId: Joi.string().custom(validateMongoObjectId).required(),
  }),
  body: Joi.object({
    cancellationReason: Joi.string().max(500).optional(),
  }),
};

export const getOrdersByEventSchema = {
  params: Joi.object({
    eventId: Joi.string().custom(validateMongoObjectId).required(),
  }),
  query: Joi.object({
    status: Joi.string()
      .valid(...Object.values(OrderStatus))
      .optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(10),
  }),
};

export const confirmOrderSchema = {
  params: Joi.object({
    orderId: Joi.string().custom(validateMongoObjectId).required(),
  }),
  body: Joi.object({
    paymentMethod: Joi.string().required(),
    paymentTransactionId: Joi.string().required(),
  }),
};

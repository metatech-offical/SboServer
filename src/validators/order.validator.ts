import Joi from "joi";
import { validateMongoObjectId } from "../utils/joiHelper";
import { EOrderStatus } from "../models/orders/order.types";

export const createOrderValidator = {
  body: Joi.object({
    checkoutType: Joi.string()
      .valid("from_cart", "buy_now")
      .required()
      .messages({
        "any.only": "Invalid checkout type",
      }),
    addressId: Joi.string().custom(validateMongoObjectId).required(),
    checkoutItems: Joi.array()
      .items(
        Joi.object({
          productId: Joi.string().custom(validateMongoObjectId).required(),
          quantity: Joi.number().integer().min(1).required(),
          variant: Joi.object({
            size: Joi.string().optional().allow("", null),
            color: Joi.string().optional().allow("", null),
            price: Joi.number().optional().allow("", null),
            sku: Joi.string().required().allow("", null),
          }).optional(),
        })
      )
      .min(1)
      .required(),
  }),
};

export const orderStatusValidator = {
  body: Joi.object({
    status: Joi.string()
      .required()
      .valid(...Object.values(EOrderStatus)),
    orderId: Joi.string().custom(validateMongoObjectId).required(),
  }),
};

export const orderListValidator = {
  query: Joi.object({
    page: Joi.number().integer().min(1).optional().default(1),
    limit: Joi.number().integer().min(1).max(100).optional(),
    creatorId: Joi.string().custom(validateMongoObjectId).optional(),
    status: Joi.string()
      .optional()
      .valid(...Object.values(EOrderStatus)),
  }),
};

export const orderIdValidator = Joi.object({
  orderId: Joi.string().custom(validateMongoObjectId).required(),
});

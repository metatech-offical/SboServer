import Joi from "joi";
import { validateMongoObjectId } from "../utils/joiHelper";

export const addToCartSchema = {
  body: Joi.object({
    productId: Joi.string().custom(validateMongoObjectId).required(),
    storeId: Joi.string().custom(validateMongoObjectId).required(),
    variant: Joi.object({
      size: Joi.string().allow("").required(),
      color: Joi.string().allow("").optional(),
      sku: Joi.string().required(),
      price: Joi.number().required(),
    }).optional(),
    quantity: Joi.number().integer().min(1).default(1),
  }),
};

export const removeFromCartSchema = {
  body: Joi.object({
    productId: Joi.string().custom(validateMongoObjectId).required(),
    variant: Joi.object({
      sku: Joi.string().required(),
      size: Joi.string().allow("").optional(),
      color: Joi.string().allow("").optional(),
      price: Joi.number().optional(),
    }).optional(),
  }),
};

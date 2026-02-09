import { validateMongoObjectId } from "../utils/joiHelper";
import { Joi } from "../middlewares/validator";

export const addPlanValidator = Joi.object({
  interval: Joi.string()
    .valid("monthly", "quarterly", "six_months", "yearly")
    .required(),
  currency: Joi.string().required(),
  price: Joi.number().min(0).required(),
  description: Joi.string().max(300).optional(),
});

export const subscribeValidator = Joi.object({
  planId: Joi.string().custom(validateMongoObjectId).required(),
});

export const unsubscribeValidator = Joi.object({
  creatorId: Joi.string().custom(validateMongoObjectId).required(),
});

export const getCreatorPlansValidator = {
  params: Joi.object({
    creatorId: Joi.string().custom(validateMongoObjectId).required(),
  }),
};

export const updatePlanValidator = Joi.object({
  interval: Joi.string()
    .valid("monthly", "quarterly", "six_months", "yearly")
    .optional(),
  currency: Joi.string().optional(),
  price: Joi.number().min(0).optional(),
  description: Joi.string().max(300).optional(),
});

export const planIdValidator = Joi.object({
  planId: Joi.string().custom(validateMongoObjectId).required().messages({
    "any.required": "Plan ID is required",
  }),
});

export const getSubscribedCreatorsQuery = Joi.object({
  search: Joi.string().optional(),
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(10),
  sort: Joi.string().valid("asc", "desc").default("desc"),
});

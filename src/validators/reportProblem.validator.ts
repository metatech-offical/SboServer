import { Joi } from "../middlewares/validator";

export const reportProblemValidator = Joi.object({
  category: Joi.string().required().messages({
    "string.empty": "Category is required.",
    "any.required": "Category is a mandatory field.",
  }),
  message: Joi.string().required().messages({
    "string.empty": "Message is required.",
    "any.required": "Message is a mandatory field.",
  }),
});

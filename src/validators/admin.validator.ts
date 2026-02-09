import { Joi } from "../middlewares/validator";
import { AdminRole, AdminStatus } from "../models/admin/admin.types";
import { UserStatus } from "../models/user/user.type";

export const adminLoginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
});

// User management validators
export const userIdParamSchema = Joi.object({
  userId: Joi.string().required(),
});

export const updateUserStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(UserStatus))
    .required(),
  reason: Joi.string().optional(),
});

export const suspendUserSchema = Joi.object({
  reason: Joi.string().optional(),
});

export const banUserSchema = Joi.object({
  reason: Joi.string().required().messages({
    "string.empty": "Reason is required for banning a user",
    "any.required": "Reason is required for banning a user",
  }),
});

export const createAdminSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  role: Joi.string()
    .valid(...Object.values(AdminRole))
    .optional(),
  phoneNumber: Joi.string().optional(),
});

export const updateAdminProfileSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  phoneNumber: Joi.string().optional(),
  avatar: Joi.string().uri().optional(),
});

export const updateAdminStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(AdminStatus))
    .required(),
});

export const updateAdminRoleSchema = Joi.object({
  role: Joi.string()
    .valid(...Object.values(AdminRole))
    .required(),
});

// Creator management validators
export const creatorIdParamSchema = Joi.object({
  creatorId: Joi.string().required(),
});

export const disableCreatorSchema = Joi.object({
  reason: Joi.string().optional(),
});

export const removeContentSchema = Joi.object({
  contentType: Joi.string()
    .valid("post", "short", "stream", "all")
    .required(),
  contentId: Joi.string().optional(),
  reason: Joi.string().optional(),
});

// Content moderation validators
export const videoIdParamSchema = Joi.object({
  videoId: Joi.string().required(),
});

export const shortIdParamSchema = Joi.object({
  shortId: Joi.string().required(),
});

export const postIdParamSchema = Joi.object({
  postId: Joi.string().required(),
});

export const deleteContentSchema = Joi.object({
  reason: Joi.string().optional(),
});

// Event management validators
export const eventIdParamSchema = Joi.object({
  eventId: Joi.string().required(),
});

export const ticketIdParamSchema = Joi.object({
  ticketId: Joi.string().required(),
});

export const orderIdParamSchema = Joi.object({
  orderId: Joi.string().required(),
});

export const updateEventStatusSchema = Joi.object({
  status: Joi.string()
    .valid("scheduled", "cancelled", "postponed")
    .required(),
  reason: Joi.string().optional(),
  newDateTime: Joi.date().optional(),
});

export const pauseTicketSchema = Joi.object({
  pause: Joi.boolean().required(),
});

export const deleteEventSchema = Joi.object({
  reason: Joi.string().optional(),
});

export const updateOrderStatusSchema = Joi.object({
  orderStatus: Joi.string()
    .valid("pending", "confirmed", "cancelled", "refunded", "refund_requested", "failed")
    .required(),
  cancellationReason: Joi.string().optional(),
  refundReason: Joi.string().optional(),
  refundAmount: Joi.number().min(0).optional(),
});

// Merchandise management validators
export const productIdParamSchema = Joi.object({
  productId: Joi.string().required(),
});

export const storeIdParamSchema = Joi.object({
  storeId: Joi.string().required(),
});

export const updateProductStatusSchema = Joi.object({
  status: Joi.string()
    .valid("live", "draft", "coming_soon")
    .required(),
});

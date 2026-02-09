import { EContentType } from "../constants/collectionNames";
import { Joi } from "../middlewares/validator";
import { validateMongoObjectId } from "../utils/joiHelper";

export const getAllPlaylistsForUserSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).default(10),
    search: Joi.string().allow("").optional(),
    createdBy: Joi.string()
      .custom(validateMongoObjectId)
      .optional()
      .messages({
        "any.invalid": "Invalid user ID format",
      })
      .allow(""),
  }),
};

export const createPlaylistSchema = {
  body: Joi.object({
    title: Joi.string().min(1).max(100).required(),
    description: Joi.string().max(500).optional(),
  }),
};

export const deletePlaylistSchema = {
  params: Joi.object({
    id: Joi.string()
      .regex(/^[0-9a-fA-F]{24}$/)
      .required()
      .label("Playlist ID"),
  }),
};

export const addItemToPlaylistSchema = {
  params: Joi.object({
    id: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        "string.pattern.base": "Playlist ID must be a valid ObjectId.",
      }),
  }),
  body: Joi.object({
    items: Joi.array()
      .items(
        Joi.object({
          contentId: Joi.string()
            .pattern(/^[0-9a-fA-F]{24}$/)
            .required(),
          contentType: Joi.string()
            .valid(EContentType.STREAM, EContentType.SHORT)
            .required(),
        })
      )
      .min(1)
      .required(),
  }),
};

export const removeItemFromPlaylistSchema = {
  params: Joi.object({
    id: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required(),
  }),
  body: Joi.object({
    contentId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required(),
    contentType: Joi.string()
      .valid(EContentType.STREAM, EContentType.SHORT)
      .required(),
  }),
};

export const updatePlaylistSchema = {
  params: Joi.object({
    id: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required(),
  }),
  body: Joi.object({
    title: Joi.string().min(1).max(100).optional(),
    description: Joi.string().max(500).optional(),
  }),
};

export const getPlaylistByIdSchema = {
  params: Joi.object({
    id: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required(),
  }),
};

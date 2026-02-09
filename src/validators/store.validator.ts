import Joi from "joi";
import { validateMongoObjectId } from "../utils/joiHelper";

export const createStoreSchema = {
  body: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    bio: Joi.string().max(500).optional(),
    logo: Joi.string().uri().optional(),
    banner: Joi.string().uri().optional(),
  }),
};

export const getStoresSchema = {
  query: Joi.object({
    search: Joi.string().allow("", null).optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(10),
  }),
};

export const createCollectionSchema = {
  body: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    description: Joi.string().max(500).optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    coverImage: Joi.string().uri().optional(),
  }),
};

export const getCollectionsSchema = {
  query: Joi.object({
    search: Joi.string().allow("", null).optional(),
    tag: Joi.string().allow("", null).optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
  }),
};

export const getCollectionsOfAStoreSchema = {
  query: Joi.object({
    search: Joi.string().allow("", null).optional(),
    tag: Joi.string().allow("", null).optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
  }),
  params: Joi.object({
    storeId: Joi.custom(validateMongoObjectId).required(),
  }),
};

export const getCollectionByIdSchema = {
  params: Joi.object({
    collectionId: Joi.string().custom(validateMongoObjectId).required(),
  }),
};

export const updateCollectionSchema = {
  params: Joi.object({
    collectionId: Joi.string().custom(validateMongoObjectId).required(),
  }),
  body: Joi.object({
    name: Joi.string().min(1).max(100).optional(),
    description: Joi.string().max(500).optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    coverImage: Joi.string().uri().optional(),
  }),
};

export const createProductSchema = {
  body: Joi.object({
    productName: Joi.string().min(1).max(100).required(),
    description: Joi.string().max(2000).optional(),
    price: Joi.number().min(0).optional(),
    media: Joi.array().items(Joi.string().uri()).min(1).required(),
    hasVariants: Joi.boolean().default(false),
    sku: Joi.string().when("variants", {
      is: Joi.exist().not(),
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),

    category: Joi.string().required(),
    returnPolicy: Joi.string().optional().allow("", null),
    tags: Joi.array().items(Joi.string()).optional(),
    collectionId: Joi.string().custom(validateMongoObjectId).required(),
    status: Joi.string().valid("live", "draft", "coming_soon").default("draft"),
    stock: Joi.number().min(0).default(0),
    variants: Joi.array()
      .items(
        Joi.object({
          size: Joi.string().required(),
          color: Joi.string().optional(),

          stock: Joi.number().min(0).required(),
          sku: Joi.string().required(),
          price: Joi.number().min(0).required(),
        })
      )
      .optional(),
  }),
};

// export const getProductsSchema = {
//   query: Joi.object({
//     search: Joi.string().allow("", null).optional(),
//     category: Joi.string().optional(),
//     status: Joi.string().valid("live", "draft", "coming_soon").optional(),
//     collectionId: Joi.string().custom(validateMongoObjectId).optional(),
//     page: Joi.number().integer().min(1).default(1),
//     limit: Joi.number().integer().min(1).max(50).default(10),
//   }),
// };

export const getProductsSchema = {
  query: Joi.object({
    search: Joi.string().allow("", null).optional(),
    category: Joi.string().optional(),
    status: Joi.string().valid("live", "draft", "coming_soon").optional(),
    collectionId: Joi.string().custom(validateMongoObjectId).optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(10),
    priceMin: Joi.number().min(0).optional(),
    priceMax: Joi.number().min(0).optional(),
    sortBy: Joi.string()
      .valid("price_low_to_high", "price_high_to_low")
      .optional(),
  }),
};

export const getProductByIdSchema = {
  params: Joi.object({
    productId: Joi.string().custom(validateMongoObjectId).required(),
  }),
};

export const addRemoveWishlistSchema = {
  params: Joi.object({
    productId: Joi.string().custom(validateMongoObjectId).required(),
  }),
};

export const getWishlistSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
  }),
};

export const updateProductSchema = {
  params: Joi.object({
    id: Joi.string().custom(validateMongoObjectId).required(),
  }),
  body: Joi.object({
    productName: Joi.string().min(1).max(100).optional(),
    description: Joi.string().max(2000).optional(),
    price: Joi.number().min(0).optional(),
    media: Joi.array().items(Joi.string().uri()).min(1).optional(),
    sku: Joi.string().optional(),
    category: Joi.string().optional(),
    returnPolicy: Joi.string().optional().allow("", null),
    tags: Joi.array().items(Joi.string()).optional(),
    collectionId: Joi.string().custom(validateMongoObjectId).optional(),
    status: Joi.string().valid("live", "draft", "coming_soon").optional(),
    stock: Joi.number().min(0).default(0),
    hasVariants: Joi.boolean().default(false),
    variants: Joi.array()
      .items(
        Joi.object({
          size: Joi.string().required(),
          stock: Joi.number().min(0).required(),
          sku: Joi.string().required(),
          price: Joi.number().min(0).required(),
          color: Joi.string().optional(),
        })
      )
      .optional(),
  }),
};

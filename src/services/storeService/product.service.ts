// src/services/store/storeProduct.service.ts
import { FilterQuery, Types } from "mongoose";
import { Store } from "../../models/store/store.schema";
import { StoreCollection } from "../../models/store/storeCollection.schema";
import { ResultDB } from "../../utils/responseHandler";
import { STATUS_CODES } from "../../constants/statusCodes";
import { MESSAGES, PRODUCT_MESSAGES } from "../../constants/responseMessage";
import { StoreProduct } from "../../models/store/storeProducts.schema";
import { IStore, IStoreProduct } from "../../models/store/store.types";
import { Wishlist } from "../../models/user/wishlisht.schema";
import { getCreatorStore } from "../../models/store/helper";

//to be optimized later
// export const createProduct = async ({
//   productName,
//   description,
//   price,
//   media,
//   sku,
//   category,
//   returnPolicy,
//   tags,
//   collectionId,
//   variants,
//   ownerId,
// }: {
//   productName: string;
//   description?: string;
//   price: number;
//   media: string[];
//   sku?: string;
//   category: string;
//   returnPolicy?: string;
//   tags?: string[];
//   collectionId: Types.ObjectId;
//   variants: {
//     size: string;
//     stock: number;
//     sku: string;
//   }[];
//   ownerId: Types.ObjectId;
// }) => {
//   const collection = await StoreCollection.findOne({
//     _id: collectionId,
//   }).populate("store");

//   const store = collection?.store as unknown as IStore;
//   if (!store || store.owner.toString() !== ownerId.toString()) {
//     return ResultDB(
//       STATUS_CODES.FORBIDDEN,
//       false,
//       PRODUCT_MESSAGES.COLLECTION_NOT_FOUND
//     );
//   }

//   // Optional: check for duplicate variant SKUs here if needed

//   const product = await StoreProduct.create({
//     productName,
//     description,
//     price,
//     media,
//     sku,
//     category,
//     returnPolicy,
//     tags,
//     collectionId,
//     storeId: store._id,
//     variants,
//   });

//   await Store.findByIdAndUpdate(store._id, { $inc: { totalProducts: 1 } });

//   return ResultDB(
//     STATUS_CODES.CREATED,
//     true,
//     PRODUCT_MESSAGES.CREATED,
//     product
//   );
// };

/**
 * Create a new prduct in a store collection.
 * @param param0
 * @returns
 */
export const createProduct = async ({
  productName,
  description,
  price,
  media,
  sku,
  category,
  returnPolicy,
  tags,
  collectionId,
  status,
  variants,
  ownerId,
  stock,
  hasVariants,
}: {
  productName: string;
  description?: string;
  price: number;
  media: string[];
  sku?: string;
  category: string;
  returnPolicy?: string;
  tags?: string[];
  collectionId: Types.ObjectId;
  status?: "live" | "draft" | "coming_soon";
  variants: {
    size: string;
    stock: number;
    sku: string;
    price: number;
    color?: string;
  }[];
  ownerId: Types.ObjectId;
  stock?: number;
  hasVariants: boolean;
}) => {
  const store = await getCreatorStore(ownerId);
  if ("statusCode" in store) return store;

  const collection = await StoreCollection.findOne({
    _id: collectionId,
    store: store._id,
  });

  if (!collection) {
    return ResultDB(
      STATUS_CODES.BAD_REQUEST,
      false,
      PRODUCT_MESSAGES.COLLECTION_NOT_FOUND
    );
  }
  // sku should be unique for each product in a collection
  const skuId = `${sku}-${Date.now()}`;
  // Optional: check for duplicate variant SKUs here if needed
  // TODO:Check if product variants size is unique
  const product = await StoreProduct.create({
    productName,
    description,
    price,
    media,
    sku: skuId,
    category,
    returnPolicy,
    tags,
    collectionId,
    storeId: store._id,
    status: status || "draft",
    variants : variants.map((variant) => ({
      ...variant,
      sku: `${variant.sku}-${Date.now()}`,
    })),
    stock,
    hasVariants,
  });

	const storeUpdates: { totalProducts: number; liveProducts?: number } = { totalProducts: 1 };
	if (status === "live") {
		storeUpdates.liveProducts = 1;
	}

	// Update global return policy if provided
	const updateQuery: {
		$inc: { totalProducts: number; liveProducts?: number };
		$set?: { globalReturnPolicy: string };
	} = { $inc: storeUpdates };
	if (returnPolicy !== undefined) {
		updateQuery.$set = { globalReturnPolicy: returnPolicy };
	}

	await Store.findByIdAndUpdate(store._id, updateQuery);
  return ResultDB(
    STATUS_CODES.CREATED,
    true,
    PRODUCT_MESSAGES.CREATED,
    product
  );
};

/**
 * we are using checks like isAddedToWishlist = true/false
 * if checks are between 5 - 10 then we can use separate functions like enrichProductList(products[], userId).
 * and then call them in promise.all.
 * If checks are more than 10 then we can use aggregation pipeline to do the same.
 * @param param0
 * @returns
 */
export const getProducts = async ({
  ownerId,
  search,
  category,
  status,
  collectionId,
  priceMin,
  priceMax,
  sortBy,
  page = 1,
  limit = 10,
}: {
  ownerId: Types.ObjectId;
  search?: string;
  category?: string;
  status?: string;
  collectionId?: string;
  priceMin?: number;
  priceMax?: number;
  sortBy?: string;
  page?: number;
  limit?: number;
}) => {
  const store = await getCreatorStore(ownerId);
  if ("statusCode" in store) return store;

  // Build query for initial $match
  const matchQuery: FilterQuery<any> = {
    storeId: store._id,
  };

  if (search) {
    matchQuery.$text = { $search: search };
  }

  if (category) {
    matchQuery.category = category;
  }

  if (status) {
    matchQuery.status = status;
  }

  if (collectionId && Types.ObjectId.isValid(collectionId)) {
    matchQuery.collectionId = new Types.ObjectId(collectionId);
  }

  // Aggregation Pipeline
  const pipeline: any[] = [
    { $match: matchQuery },

    // Compute minVariantPrice: If variants exist, use min; else use root price
    {
      $addFields: {
        minVariantPrice: {
          $cond: [
            { $gt: [{ $size: "$variants" }, 0] },
            { $min: "$variants.price" },
            "$price",
          ],
        },
      },
    },
  ];

  // Filter by price range using minVariantPrice
  const priceMatch: any = {};
  if (priceMin !== undefined) priceMatch.$gte = priceMin;
  if (priceMax !== undefined) priceMatch.$lte = priceMax;
  if (Object.keys(priceMatch).length) {
    pipeline.push({ $match: { minVariantPrice: priceMatch } });
  }

  // Sorting
  let sortStage: any = { createdAt: -1 };
  if (sortBy === "price_low_to_high") {
    sortStage = { minVariantPrice: 1 };
  } else if (sortBy === "price_high_to_low") {
    sortStage = { minVariantPrice: -1 };
  }
  pipeline.push({ $sort: sortStage });

  // Pagination
  pipeline.push({ $skip: (page - 1) * limit }, { $limit: limit });

  // Run aggregation
  const products = await StoreProduct.aggregate(pipeline);

  // Total count (for pagination) – needs to run similar aggregation minus $skip/$limit
  const countPipeline = pipeline.filter(
    (stage) => !stage.$skip && !stage.$limit && !stage.$sort
  );
  countPipeline.push({ $count: "total" });
  const countResult = await StoreProduct.aggregate(countPipeline);
  const total = countResult.length ? countResult[0].total : 0;

  // Wishlist lookup
  const productIds = products.map((p) => p._id);
  const wishlist = await Wishlist.find({
    userId: ownerId,
    productId: { $in: productIds },
  }).select("productId");

  const wishlistProductIds = new Set(
    wishlist.map((w) => w.productId.toString())
  );
  const totalProductList = products.map((product) => ({
    ...product,
    isAddedToWishlist: wishlistProductIds.has(product._id.toString()),
  }));

  return ResultDB(STATUS_CODES.OK, true, PRODUCT_MESSAGES.FETCHED, {
    totalProductList,
    pagination: { page, limit, total },
  });
};

export const getProductById = async ({
  productId,
  userId,
}: {
  productId: string;
  userId: Types.ObjectId;
}) => {
  const product = await StoreProduct.findById(productId)
    .populate("collectionId", "name")
    .lean();

  if (!product) {
    return ResultDB(STATUS_CODES.NOT_FOUND, false, PRODUCT_MESSAGES.NOT_FOUND);
  }

  const isInWishlist = await Wishlist.exists({
    userId,
    productId: product._id,
  });

  return ResultDB(STATUS_CODES.OK, true, PRODUCT_MESSAGES.FETCHED, {
    ...product,
    isAddedToWishlist: !!isInWishlist,
  });
};

export const addProductToWishlist = async ({
  productId,
  userId,
}: {
  productId: Types.ObjectId;
  userId: Types.ObjectId;
}) => {
  const product = await StoreProduct.findById(productId).lean();
  if (!product) {
    return ResultDB(STATUS_CODES.NOT_FOUND, false, PRODUCT_MESSAGES.NOT_FOUND);
  }

  await Wishlist.updateOne(
    { userId, productId },
    { $set: { userId, productId } },
    { upsert: true }
  );

  return ResultDB(STATUS_CODES.OK, true, PRODUCT_MESSAGES.WISHLISTED, null);
};

export const removeProductFromWishlist = async ({
  productId,
  userId,
}: {
  productId: Types.ObjectId;
  userId: Types.ObjectId;
}) => {
  await Wishlist.deleteOne({ userId, productId });
  return ResultDB(STATUS_CODES.OK, true, PRODUCT_MESSAGES.UNWISHLISTED, null);
};

export const removeProduct = async ({
  productId,
  userId,
}: {
  productId: Types.ObjectId;
  userId: Types.ObjectId;
}) => {
  const deleteResult = await StoreProduct.findByIdAndDelete(productId);

  if (!deleteResult) {
    return ResultDB(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      "Failed to delete product!",
      null
    );
  }

  const incUpdates: Record<string, number> = { totalProducts: -1 };
  if (deleteResult.status === "live") {
    // reduce quantity in liveProducts
    incUpdates.liveProducts = -1;
  }

  if (deleteResult.stock === 0) {
    // reduce quantity in outOfStockProducts
    incUpdates.outOfStockProducts = -1;
  }
  await Store.findByIdAndUpdate(deleteResult.storeId, { $inc: incUpdates });
  return ResultDB(STATUS_CODES.OK, true, MESSAGES.DELETED, null);
};

export const getUserWishlist = async ({
  userId,
  page = 1,
  limit = 10,
}: {
  userId: Types.ObjectId;
  page?: number;
  limit?: number;
}) => {
  const wishlist = await Wishlist.find({ userId })
    .skip((page - 1) * limit)
    .limit(limit)
    .select("productId")
    .lean();

  const total = await Wishlist.countDocuments({ userId });

  const productIds = wishlist.map((w) => w.productId);
  const products = await StoreProduct.find({ _id: { $in: productIds } }).lean();

  // Preserve order based on wishlist order
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));
  const ordered = productIds.map((id) => productMap.get(id.toString()));

  return ResultDB(STATUS_CODES.OK, true, "Wishlist fetched", {
    products: ordered,
    pagination: { page, limit, total },
  });
};

/**
 * Update a product by ID
 * @param param0
 * @returns
 */
export const updateProduct = async ({
  productId,
  ownerId,
  updateData,
}: {
  productId: string;
  ownerId: Types.ObjectId;
  updateData: {
    productName?: string;
    description?: string;
    price?: number;
    media?: string[];
    sku?: string;
    category?: string;
    returnPolicy?: string;
    tags?: string[];
    collectionId?: Types.ObjectId;
    status?: "live" | "draft" | "coming_soon";
    variants?: {
      size: string;
      stock: number;
      sku: string;
    }[];
    hasVariants?: boolean;
    stock?: number;
  };
}) => {
  const store = await getCreatorStore(ownerId);
  if ("statusCode" in store) return store;

  // Check if product exists and belongs to the store
  const existingProduct = await StoreProduct.findOne({
    _id: productId,
    storeId: store._id,
  });

  if (!existingProduct) {
    return ResultDB(
      STATUS_CODES.NOT_FOUND,
      false,
      PRODUCT_MESSAGES.PRODUCT_NOT_FOUND
    );
  }

  // If collectionId is being updated, verify it belongs to the store
  if (updateData.collectionId) {
    const collection = await StoreCollection.findOne({
      _id: updateData.collectionId,
      store: store._id,
    });

    if (!collection) {
      return ResultDB(
        STATUS_CODES.BAD_REQUEST,
        false,
        PRODUCT_MESSAGES.COLLECTION_NOT_FOUND
      );
    }
  }

  // Update the product
  const updatedProduct = await StoreProduct.findByIdAndUpdate(
    productId,
    { $set: updateData },
    { new: true, runValidators: true }
  );

	if (!updatedProduct) {
		return ResultDB(STATUS_CODES.INTERNAL_SERVER_ERROR, false, PRODUCT_MESSAGES.UPDATE_FAILED);
	}

	// Update global return policy if returnPolicy is being updated
	if (updateData.returnPolicy !== undefined) {
		await Store.findByIdAndUpdate(store._id, { $set: { globalReturnPolicy: updateData.returnPolicy } });
	}

	return ResultDB(STATUS_CODES.OK, true, PRODUCT_MESSAGES.UPDATED, updatedProduct);
};

// export const getProductsByCollections = async ({
//   ownerId,
//   search,
//   category,
//   status,
//   collectionId,
//   page = 1,
//   limit = 10,
// }: {
//   ownerId: Types.ObjectId;
//   search?: string;
//   category?: string;
//   status?: string;
//   collectionId?: string;
//   page?: number;
//   limit?: number;
// }) => {
//   const query: FilterQuery<IStoreProduct> = {};

//   if (search) {
//     query.$text = { $search: search };
//   }

//   if (category) {
//     query.category = category;
//   }

//   if (status) {
//     query.status = status;
//   }

//   if (collectionId && Types.ObjectId.isValid(collectionId)) {
//     query.collectionId = new Types.ObjectId(collectionId);
//   }

//   const products = await StoreProduct.find(query)
//     .sort({ createdAt: -1 })
//     .skip((page - 1) * limit)
//     .limit(limit)
//     .lean();

//   const total = await StoreProduct.countDocuments(query);
//   const productIds = products.map((product) => product._id);

//   const wishlist = await Wishlist.find({
//     userId: ownerId,
//     productId: { $in: productIds },
//   }).select("productId");

//   const wishlistProductIds = new Set(
//     wishlist.map((w) => w.productId.toString())
//   );
//   const totalProductList = products.map((product) => ({
//     ...product,
//     isAddedToWishlist: wishlistProductIds.has(product._id.toString()),
//   }));
//   return ResultDB(STATUS_CODES.OK, true, PRODUCT_MESSAGES.FETCHED, {
//     totalProductList,
//     pagination: { page, limit, total },
//   });
// };

export const getProductsByCollections = async ({
  ownerId,
  search,
  category,
  status,
  collectionId,
  priceMin,
  priceMax,
  sortBy,
  page = 1,
  limit = 10,
}: {
  ownerId: Types.ObjectId;
  search?: string;
  category?: string;
  status?: string;
  collectionId?: string;
  priceMin?: number;
  priceMax?: number;
  sortBy?: string;
  page?: number;
  limit?: number;
}) => {
  // Build query for initial $match
  const matchQuery: FilterQuery<any> = {};
  if (search) matchQuery.$text = { $search: search };
  if (category) matchQuery.category = category;
  if (status) matchQuery.status = status;
  if (collectionId && Types.ObjectId.isValid(collectionId)) {
    matchQuery.collectionId = new Types.ObjectId(collectionId);
  }

  // Aggregation Pipeline
  const pipeline: any[] = [
    { $match: matchQuery },

    // Compute minVariantPrice: If variants exist, use min; else use root price
    {
      $addFields: {
        minVariantPrice: {
          $cond: [
            { $gt: [{ $size: "$variants" }, 0] },
            { $min: "$variants.price" },
            "$price",
          ],
        },
      },
    },
  ];

  // Filter by price range using minVariantPrice
  const priceMatch: any = {};
  if (priceMin !== undefined) priceMatch.$gte = priceMin;
  if (priceMax !== undefined) priceMatch.$lte = priceMax;
  if (Object.keys(priceMatch).length) {
    pipeline.push({ $match: { minVariantPrice: priceMatch } });
  }

  // Sorting
  let sortStage: any = { createdAt: -1 };
  if (sortBy === "price_low_to_high") {
    sortStage = { minVariantPrice: 1 };
  } else if (sortBy === "price_high_to_low") {
    sortStage = { minVariantPrice: -1 };
  }
  pipeline.push({ $sort: sortStage });

  // Pagination
  pipeline.push({ $skip: (page - 1) * limit }, { $limit: limit });

  // Run aggregation
  const products = await StoreProduct.aggregate(pipeline);

  // Total count (for pagination) – needs to run similar aggregation minus $skip/$limit
  // For exact count after all filters, repeat stages up to price filtering
  const countPipeline = pipeline.filter(
    (stage) => !stage.$skip && !stage.$limit && !stage.$sort
  );
  countPipeline.push({ $count: "total" });
  const countResult = await StoreProduct.aggregate(countPipeline);
  const total = countResult.length ? countResult[0].total : 0;

  // Wishlist lookup
  const productIds = products.map((p) => p._id);
  const wishlist = await Wishlist.find({
    userId: ownerId,
    productId: { $in: productIds },
  }).select("productId");

  const wishlistProductIds = new Set(
    wishlist.map((w) => w.productId.toString())
  );

  // Mark wishlist
  const totalProductList = products.map((product) => ({
    ...product,
    isAddedToWishlist: wishlistProductIds.has(product._id.toString()),
  }));
  return ResultDB(STATUS_CODES.OK, true, PRODUCT_MESSAGES.FETCHED, {
    totalProductList,
    pagination: { page, limit, total },
  });
};

export const getProductsByIds = async ({
  productIds,
}: {
  productIds: string[];
}) => {
  const products = await StoreProduct.find({
    _id: { $in: productIds },
    status: "live",
  })
    .populate({
      path: "store",
      select: "name owner",
      populate: { path: "owner", select: "username displayName" },
    })
    .lean();
  return products;
};

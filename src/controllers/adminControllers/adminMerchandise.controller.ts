import type { Request, Response } from "express";
import { Types } from "mongoose";
import { STATUS_CODES } from "../../constants/statusCodes";
import {
  ErrorResponse,
  SuccessResponse,
  NotFoundErrorResponse,
  BadRequestErrorResponse,
  printError,
} from "../../utils/responseHandler";
import { Store } from "../../models/store/store.schema";
import { StoreProduct } from "../../models/store/storeProducts.schema";
import { StoreCollection } from "../../models/store/storeCollection.schema";
import { PRODUCT_STATUS } from "../../models/store/store.types";

/**
 * Get merchandise statistics
 * GET /api/v1/admin/merchandise/stats
 */
export const httpGetMerchandiseStats = async (req: Request, res: Response) => {
  try {
    const [
      totalStores,
      activeStores,
      totalProducts,
      liveProducts,
      draftProducts,
      comingSoonProducts,
      totalCollections,
    ] = await Promise.all([
      Store.countDocuments(),
      Store.countDocuments({ isActive: true }),
      StoreProduct.countDocuments(),
      StoreProduct.countDocuments({ status: PRODUCT_STATUS.LIVE }),
      StoreProduct.countDocuments({ status: PRODUCT_STATUS.DRAFT }),
      StoreProduct.countDocuments({ status: PRODUCT_STATUS.COMING_SOON }),
      StoreCollection.countDocuments(),
    ]);

    // Get total out of stock products
    const outOfStockStats = await StoreProduct.aggregate([
      { $match: { status: PRODUCT_STATUS.LIVE } },
      {
        $project: {
          isOutOfStock: {
            $cond: [
              { $eq: ["$hasVariants", true] },
              { $eq: [{ $sum: "$variants.stock" }, 0] },
              { $eq: ["$stock", 0] },
            ],
          },
        },
      },
      { $match: { isOutOfStock: true } },
      { $count: "count" },
    ]);

    const outOfStockProducts = outOfStockStats[0]?.count || 0;

    // Get top categories
    const topCategories = await StoreProduct.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    return SuccessResponse(res, STATUS_CODES.OK, true, "Merchandise stats retrieved", {
      totalStores,
      activeStores,
      totalProducts,
      liveProducts,
      draftProducts,
      comingSoonProducts,
      outOfStockProducts,
      totalCollections,
      topCategories: topCategories.map((c) => ({ category: c._id, count: c.count })),
    });
  } catch (error) {
    printError(error, "httpGetMerchandiseStats");
    return ErrorResponse(res);
  }
};

/**
 * Get all products with filters
 * GET /api/v1/admin/merchandise/products
 */
export const httpGetAllProducts = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      category,
      storeId,
      collectionId,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;
    console.log("collectionId", collectionId);

    const query: any = {};

    // Handle collectionId - match the working user service approach exactly
    let collectionCondition: any = null;
    if (collectionId) {
      if (collectionId === 'no-collection' || collectionId === 'null') {
        // Products without a collection
        collectionCondition = {
          $or: [
            { collectionId: null },
            { collectionId: { $exists: false } }
          ]
        };
      } else if (Types.ObjectId.isValid(collectionId as string)) {
        // Valid collectionId - set it directly (exactly like the working user service)
        collectionCondition = { collectionId: new Types.ObjectId(collectionId as string) };
      } else {
        // Invalid collectionId, return empty results
        return SuccessResponse(res, STATUS_CODES.OK, true, "Products retrieved", {
          products: [],
          pagination: { total: 0, page: pageNum, limit: limitNum, totalPages: 0 },
        });
      }
    }

    // Handle search
    let searchCondition: any = null;
    if (search) {
      searchCondition = {
        $or: [
          { productName: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
          { category: { $regex: search, $options: "i" } },
          { tags: { $in: [new RegExp(search as string, "i")] } }
        ]
      };
    }

    // Combine conditions - if both exist, use $and; otherwise use the single condition
    if (collectionCondition && searchCondition) {
      query.$and = [collectionCondition, searchCondition];
    } else if (collectionCondition) {
      Object.assign(query, collectionCondition);
    } else if (searchCondition) {
      Object.assign(query, searchCondition);
    }

    if (status) {
      query.status = status;
    }

    if (category) {
      query.category = category;
    }

    if (storeId) {
      query.storeId = new Types.ObjectId(storeId as string);
    }

    const sortOptions: any = {};
    sortOptions[sortBy as string] = sortOrder === "asc" ? 1 : -1;

    const [products, total] = await Promise.all([
      StoreProduct.find(query)
        .populate({
          path: "storeId",
          select: "name logo owner isActive",
          populate: { path: "owner", select: "username displayName profilePicture" },
        })
        .populate("collectionId", "name")
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      StoreProduct.countDocuments(query),
    ]);

    const formattedProducts = products.map((p: any) => ({
      id: p._id,
      productName: p.productName,
      description: p.description,
      price: p.price,
      media: p.media,
      category: p.category,
      status: p.status,
      tags: p.tags,
      stock: p.hasVariants
        ? p.variants.reduce((sum: number, v: any) => sum + v.stock, 0)
        : p.stock,
      hasVariants: p.hasVariants,
      variantsCount: p.variants?.length || 0,
      store: p.storeId
        ? {
            id: p.storeId._id,
            name: p.storeId.name,
            logo: p.storeId.logo,
            isActive: p.storeId.isActive,
            owner: p.storeId.owner
              ? {
                  id: p.storeId.owner._id,
                  username: p.storeId.owner.username,
                  displayName: p.storeId.owner.displayName,
                  profilePicture: p.storeId.owner.profilePicture,
                }
              : null,
          }
        : null,
      collection: p.collectionId
        ? { id: p.collectionId._id, name: p.collectionId.name }
        : null,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    return SuccessResponse(res, STATUS_CODES.OK, true, "Products retrieved", {
      products: formattedProducts,
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    printError(error, "httpGetAllProducts");
    return ErrorResponse(res);
  }
};

/**
 * Get product by ID
 * GET /api/v1/admin/merchandise/products/:productId
 */
export const httpGetProductById = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    const product: any = await StoreProduct.findById(productId)
      .populate({
        path: "storeId",
        select: "name logo banner bio owner isActive totalProducts",
        populate: { path: "owner", select: "username displayName email profilePicture verified" },
      })
      .populate("collectionId", "name description coverImage")
      .lean();

    if (!product) {
      return NotFoundErrorResponse(res, "Product not found");
    }

    const productDetails = {
      id: product._id,
      productName: product.productName,
      description: product.description,
      price: product.price,
      media: product.media,
      sku: product.sku,
      category: product.category,
      tags: product.tags,
      status: product.status,
      returnPolicy: product.returnPolicy,
      stock: product.hasVariants
        ? product.variants.reduce((sum: number, v: any) => sum + v.stock, 0)
        : product.stock,
      hasVariants: product.hasVariants,
      variants: product.variants,
      store: product.storeId
        ? {
            id: product.storeId._id,
            name: product.storeId.name,
            logo: product.storeId.logo,
            banner: product.storeId.banner,
            bio: product.storeId.bio,
            isActive: product.storeId.isActive,
            totalProducts: product.storeId.totalProducts,
            owner: product.storeId.owner
              ? {
                  id: product.storeId.owner._id,
                  username: product.storeId.owner.username,
                  displayName: product.storeId.owner.displayName,
                  email: product.storeId.owner.email,
                  profilePicture: product.storeId.owner.profilePicture,
                  verified: product.storeId.owner.verified,
                }
              : null,
          }
        : null,
      collection: product.collectionId
        ? {
            id: product.collectionId._id,
            name: product.collectionId.name,
            description: product.collectionId.description,
            coverImage: product.collectionId.coverImage,
          }
        : null,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };

    return SuccessResponse(res, STATUS_CODES.OK, true, "Product details retrieved", productDetails);
  } catch (error) {
    printError(error, "httpGetProductById");
    return ErrorResponse(res);
  }
};

/**
 * Update product status (disable/enable)
 * PUT /api/v1/admin/merchandise/products/:productId/status
 */
export const httpUpdateProductStatus = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { status } = req.body;

    const product = await StoreProduct.findById(productId);
    if (!product) {
      return NotFoundErrorResponse(res, "Product not found");
    }

    const oldStatus = product.status;
    product.status = status;
    await product.save();

    // Update store stats
    if (oldStatus === PRODUCT_STATUS.LIVE && status !== PRODUCT_STATUS.LIVE) {
      await Store.findByIdAndUpdate(product.storeId, { $inc: { liveProducts: -1 } });
    } else if (oldStatus !== PRODUCT_STATUS.LIVE && status === PRODUCT_STATUS.LIVE) {
      await Store.findByIdAndUpdate(product.storeId, { $inc: { liveProducts: 1 } });
    }

    return SuccessResponse(res, STATUS_CODES.OK, true, "Product status updated", {
      id: product._id,
      productName: product.productName,
      status: product.status,
    });
  } catch (error) {
    printError(error, "httpUpdateProductStatus");
    return ErrorResponse(res);
  }
};

/**
 * Get all stores with filters
 * GET /api/v1/admin/merchandise/stores
 */
export const httpGetAllStores = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, search, isActive, sortBy = "createdAt", sortOrder = "desc" } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const matchStage: any = {};
    if (search) {
      matchStage.$or = [
        { name: { $regex: search, $options: "i" } },
        { "ownerDetails.username": { $regex: search, $options: "i" } },
        { "ownerDetails.displayName": { $regex: search, $options: "i" } },
      ];
    }
    if (isActive !== undefined) {
      matchStage.isActive = isActive === "true";
    }

    const sortOptions: any = {};
    sortOptions[sortBy as string] = sortOrder === "asc" ? 1 : -1;

    const [stores, totalResult] = await Promise.all([
      Store.aggregate([
        {
          $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "ownerDetails",
          },
        },
        { $unwind: "$ownerDetails" },
        { $match: matchStage },
        {
          $project: {
            name: 1,
            logo: 1,
            banner: 1,
            bio: 1,
            isActive: 1,
            totalProducts: 1,
            liveProducts: 1,
            outOfStockProducts: 1,
            collectionsCount: 1,
            createdAt: 1,
            owner: {
              id: "$ownerDetails._id",
              username: "$ownerDetails.username",
              displayName: "$ownerDetails.displayName",
              profilePicture: "$ownerDetails.profilePicture",
              email: "$ownerDetails.email",
            },
          },
        },
        { $sort: sortOptions },
        { $skip: skip },
        { $limit: limitNum },
      ]),
      Store.aggregate([
        {
          $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "ownerDetails",
          },
        },
        { $unwind: "$ownerDetails" },
        { $match: matchStage },
        { $count: "total" },
      ]),
    ]);

    const total = totalResult[0]?.total || 0;

    return SuccessResponse(res, STATUS_CODES.OK, true, "Stores retrieved", {
      stores,
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    printError(error, "httpGetAllStores");
    return ErrorResponse(res);
  }
};

/**
 * Get store by ID
 * GET /api/v1/admin/merchandise/stores/:storeId
 */
export const httpGetStoreById = async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;

    const store: any = await Store.findById(storeId)
      .populate("owner", "username displayName email profilePicture bio verified")
      .lean();

    if (!store) {
      return NotFoundErrorResponse(res, "Store not found");
    }

    const collections = await StoreCollection.find({ store: store._id }).lean();
    const recentProducts = await StoreProduct.find({ storeId: store._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const storeDetails = {
      id: store._id,
      name: store.name,
      bio: store.bio,
      logo: store.logo,
      banner: store.banner,
      isActive: store.isActive,
      totalProducts: store.totalProducts,
      liveProducts: store.liveProducts,
      outOfStockProducts: store.outOfStockProducts,
      collectionsCount: store.collectionsCount,
      globalReturnPolicy: store.globalReturnPolicy,
      owner: store.owner
        ? {
            id: store.owner._id,
            username: store.owner.username,
            displayName: store.owner.displayName,
            email: store.owner.email,
            profilePicture: store.owner.profilePicture,
            bio: store.owner.bio,
            verified: store.owner.verified,
          }
        : null,
      collections: collections.map((c) => ({
        id: c._id,
        name: c.name,
        description: c.description,
        coverImage: c.coverImage,
      })),
      recentProducts: recentProducts.map((p) => ({
        id: p._id,
        productName: p.productName,
        price: p.price,
        media: p.media,
        status: p.status,
        category: p.category,
      })),
      createdAt: store.createdAt,
      updatedAt: store.updatedAt,
    };

    return SuccessResponse(res, STATUS_CODES.OK, true, "Store details retrieved", storeDetails);
  } catch (error) {
    printError(error, "httpGetStoreById");
    return ErrorResponse(res);
  }
};

/**
 * Toggle store active status
 * PUT /api/v1/admin/merchandise/stores/:storeId/toggle
 */
export const httpToggleStoreStatus = async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;

    const store = await Store.findById(storeId);
    if (!store) {
      return NotFoundErrorResponse(res, "Store not found");
    }

    store.isActive = !store.isActive;
    await store.save();

    return SuccessResponse(res, STATUS_CODES.OK, true, `Store ${store.isActive ? "activated" : "deactivated"}`, {
      id: store._id,
      name: store.name,
      isActive: store.isActive,
    });
  } catch (error) {
    printError(error, "httpToggleStoreStatus");
    return ErrorResponse(res);
  }
};

/**
 * Get product categories
 * GET /api/v1/admin/merchandise/categories
 */
export const httpGetProductCategories = async (req: Request, res: Response) => {
  try {
    const categories = await StoreProduct.distinct("category");
    return SuccessResponse(res, STATUS_CODES.OK, true, "Categories retrieved", { categories });
  } catch (error) {
    printError(error, "httpGetProductCategories");
    return ErrorResponse(res);
  }
};

/**
 * Get products by creator
 * GET /api/v1/admin/merchandise/creator/:creatorId/products
 */
export const httpGetProductsByCreator = async (req: Request, res: Response) => {
  try {
    const { creatorId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const store = await Store.findOne({ owner: new Types.ObjectId(creatorId) });
    if (!store) {
      return SuccessResponse(res, STATUS_CODES.OK, true, "No store found for this creator", {
        products: [],
        pagination: { total: 0, page: pageNum, limit: limitNum, totalPages: 0 },
      });
    }

    const [products, total] = await Promise.all([
      StoreProduct.find({ storeId: store._id })
        .populate("collectionId", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      StoreProduct.countDocuments({ storeId: store._id }),
    ]);

    const formattedProducts = products.map((p: any) => ({
      id: p._id,
      productName: p.productName,
      price: p.price,
      media: p.media,
      status: p.status,
      category: p.category,
      stock: p.hasVariants ? p.variants.reduce((sum: number, v: any) => sum + v.stock, 0) : p.stock,
      collection: p.collectionId ? { id: p.collectionId._id, name: p.collectionId.name } : null,
      createdAt: p.createdAt,
    }));

    return SuccessResponse(res, STATUS_CODES.OK, true, "Creator products retrieved", {
      store: { id: store._id, name: store.name, logo: store.logo },
      products: formattedProducts,
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    printError(error, "httpGetProductsByCreator");
    return ErrorResponse(res);
  }
};


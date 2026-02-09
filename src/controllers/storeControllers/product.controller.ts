// src/controllers/store/storeProduct.controller.ts
import { Request, Response } from "express";
import { ProductService } from "../../services";
import {
  ErrorResponse,
  printError,
  SuccessOKResponse,
  SuccessResponse,
  UnauthorizedErrorResponse,
} from "../../utils/responseHandler";
import { STATUS_CODES } from "../../constants/statusCodes";
import { PRODUCT_MESSAGES } from "../../constants/responseMessage";
import { Types } from "mongoose";
import { AuthenticatedRequest } from "../../types/express";

export const httpCreateProduct = async (req: Request, res: Response) => {
  try {
    const {
      productName,
      description,
      price,
      media,
      sku,
      stock,
      category,
      returnPolicy,
      tags,
      collectionId,
      status,
      variants,
      hasVariants,
    } = req.body;
    const ownerId = req.user?._id;
    if (!ownerId) {
      return UnauthorizedErrorResponse(res, "User not authenticated");
    }

    const result = await ProductService.createProduct({
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
    });

    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (err) {
    printError(err, "httpCreateProduct");
    return ErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      PRODUCT_MESSAGES.INTERNAL_ERROR
    );
  }
};

export const httpGetProducts = async (req: Request, res: Response) => {
  try {
    const {
      search,
      category,
      status,
      collectionId,
      priceMin,
      priceMax,
      sortBy,
      page,
      limit,
    } = req.query;
    const ownerId = req.user?._id;
    if (!ownerId) {
      return UnauthorizedErrorResponse(res, "User not authenticated");
    }
    const result = await ProductService.getProducts({
      ownerId,
      search: search as string,
      category: category as string,
      status: status as string,
      collectionId: collectionId as string,
      priceMin: priceMin !== undefined ? Number(priceMin) : undefined,
      priceMax: priceMax !== undefined ? Number(priceMax) : undefined,
      sortBy: sortBy as string,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 10,
    });

    return SuccessOKResponse(res, result.data, result.message);
  } catch (err) {
    printError(err, "httpGetProducts");
    return ErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      PRODUCT_MESSAGES.INTERNAL_ERROR
    );
  }
};

// export const httpGetProductsByCollection = async (
//   req: Request,
//   res: Response
// ) => {
//   try {
//     const { search, category, status, collectionId, page, limit } = req.query;
//     const ownerId = req.user?._id;
//     if (!ownerId) {
//       return UnauthorizedErrorResponse(res, "User not authenticated");
//     }
//     const result = await ProductService.getProductsByCollections({
//       ownerId,
//       search: search as string,
//       category: category as string,
//       status: status as string,
//       collectionId: collectionId as string,
//       page: page ? parseInt(page as string) : 1,
//       limit: limit ? parseInt(limit as string) : 10,
//     });

//     return SuccessOKResponse(res, result.data, result.message);
//   } catch (err) {
//     printError(err, "httpGetProducts");
//     return ErrorResponse(
//       res,
//       STATUS_CODES.INTERNAL_SERVER_ERROR,
//       false,
//       PRODUCT_MESSAGES.INTERNAL_ERROR
//     );
//   }
// };

export const httpGetProductsByCollection = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      search,
      category,
      status,
      collectionId,
      page,
      limit,
      priceMin,
      priceMax,
      sortBy,
    } = req.query;

    const ownerId = req.user?._id;
    if (!ownerId) {
      return UnauthorizedErrorResponse(res, "User not authenticated");
    }

    const result = await ProductService.getProductsByCollections({
      ownerId,
      search: search as string,
      category: category as string,
      status: status as string,
      collectionId: collectionId as string,
      priceMin: priceMin !== undefined ? Number(priceMin) : undefined,
      priceMax: priceMax !== undefined ? Number(priceMax) : undefined,
      sortBy: sortBy as string,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 10,
    });

    return SuccessOKResponse(res, result.data, result.message);
  } catch (err) {
    printError(err, "httpGetProducts");
    return ErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      PRODUCT_MESSAGES.INTERNAL_ERROR
    );
  }
};

export const httpGetProductById = async (req: Request, res: Response) => {
  try {
    const productId = req.params.productId;
    const userId = req.user?._id;
    if (!userId) {
      return UnauthorizedErrorResponse(res, "User not authenticated");
    }
    const result = await ProductService.getProductById({ productId, userId });

    return SuccessOKResponse(res, result.data, result.message);
  } catch (err) {
    printError(err, "httpGetProductById");
    return ErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      PRODUCT_MESSAGES.INTERNAL_ERROR
    );
  }
};

export const httpAddToWishlist = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return UnauthorizedErrorResponse(res, "User not authenticated");
    }
    const productId = req.params.productId;

    const result = await ProductService.addProductToWishlist({
      productId: new Types.ObjectId(productId),
      userId,
    });

    return SuccessOKResponse(res, null, result.message);
  } catch (err) {
    printError(err, "httpAddToWishlist");
    return ErrorResponse(res, STATUS_CODES.INTERNAL_SERVER_ERROR);
  }
};

export const httpRemoveFromWishlist = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return UnauthorizedErrorResponse(res, "User not authenticated");
    }
    const productId = req.params.productId;

    const result = await ProductService.removeProductFromWishlist({
      productId: new Types.ObjectId(productId),
      userId,
    });

    return SuccessOKResponse(res, null, result.message);
  } catch (err) {
    printError(err, "httpRemoveFromWishlist");
    return ErrorResponse(res, STATUS_CODES.INTERNAL_SERVER_ERROR);
  }
};

export const httpRemoveProduct = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user._id;
    const productId = req.params.productId;

    const result = await ProductService.removeProduct({
      productId: new Types.ObjectId(productId),
      userId,
    });

    return SuccessOKResponse(res, null, result.message);
  } catch (err) {
    printError(err, "httpRemoveProduct");
    return ErrorResponse(res, STATUS_CODES.INTERNAL_SERVER_ERROR);
  }
};

export const httpGetUserWishlist = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return UnauthorizedErrorResponse(res, "User not authenticated");
    }
    const { page = "1", limit = "10" } = req.query;

    const result = await ProductService.getUserWishlist({
      userId,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });

    return SuccessOKResponse(res, result.data, result.message);
  } catch (err) {
    printError(err, "httpGetUserWishlist");
    return ErrorResponse(res, STATUS_CODES.INTERNAL_SERVER_ERROR);
  }
};

export const httpUpdateProduct = async (req: Request, res: Response) => {
  try {
    const productId = req.params.id;

    const {
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
      stock,
      hasVariants,
    } = req.body;

    const ownerId = req.user?._id;

    if (!ownerId) {
      return UnauthorizedErrorResponse(res, "User not authenticated");
    }

    const result = await ProductService.updateProduct({
      productId,
      ownerId,
      updateData: {
        productName,
        description,
        price,
        media,
        sku,
        category,
        returnPolicy,
        tags,
        collectionId: collectionId
          ? new Types.ObjectId(collectionId)
          : undefined,
        status,
        variants,
        hasVariants,
        stock,
      },
    });

    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (err) {
    printError(err, "httpUpdateProduct");
    return ErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      PRODUCT_MESSAGES.INTERNAL_ERROR
    );
  }
};

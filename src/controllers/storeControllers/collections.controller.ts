// src/controllers/store/storeCollection.controller.ts
import { Request, Response } from "express";
import { CollectionService } from "../../services";
import { STATUS_CODES } from "../../constants/statusCodes";
import { COLLECTION_MESSAGES } from "../../constants/responseMessage";
import {
  ErrorResponse,
  printError,
  SuccessResponse,
  UnauthorizedErrorResponse,
} from "../../utils/responseHandler";

export const httpCreateCollection = async (req: Request, res: Response) => {
  try {
    const { name, description, tags, coverImage } = req.body;
    const ownerId = req.user?._id;
    if (!ownerId) {
      return UnauthorizedErrorResponse(res, "User not authenticated");
    }
    const result = await CollectionService.createCollection({
      name,
      description,
      tags,
      coverImage,
      ownerId,
    });

    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (err) {
    printError(err);
    return ErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      COLLECTION_MESSAGES.INTERNAL_ERROR
    );
  }
};

export const httpGetCollections = async (req: Request, res: Response) => {
  try {
    const { search, tag, page, limit } = req.query;
    const ownerId = req.user?._id;
    if (!ownerId) {
      return UnauthorizedErrorResponse(res, "User not authenticated");
    }
    const result = await CollectionService.getCollections({
      ownerId,
      search: search as string,
      tag: tag as string,
      page: parseInt(page as string) || 1,
      limit: parseInt(limit as string) || 10,
    });

    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (err) {
    printError(err);
    return ErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      COLLECTION_MESSAGES.INTERNAL_ERROR
    );
  }
};

export const httpGetCollectionsFromAllStore = async (
  req: Request,
  res: Response
) => {
  try {
    const { search, tag, page, limit } = req.query;
    const currentUserId = req.user?._id;
    if (!currentUserId) {
      return UnauthorizedErrorResponse(res, "User not authenticated");
    }
    const result = await CollectionService.getCollectionsFromAllStores({
      currentUserId,
      search: search as string,
      tag: tag as string,
      page: parseInt(page as string) || 1,
      limit: parseInt(limit as string) || 10,
    });

    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (err) {
    printError(err);
    return ErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      COLLECTION_MESSAGES.INTERNAL_ERROR
    );
  }
};

export const httpGetCollectionById = async (req: Request, res: Response) => {
  try {
    const collectionId = req.params.collectionId;
    const ownerId = req.user?._id;
    if (!ownerId) {
      return UnauthorizedErrorResponse(res, "User not authenticated");
    }
    const result = await CollectionService.getCollectionById({
      collectionId,
      ownerId,
    });

    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (err) {
    printError(err);
    return ErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      COLLECTION_MESSAGES.INTERNAL_ERROR
    );
  }
};

export const httpUpdateCollection = async (req: Request, res: Response) => {
  try {
    const collectionId = req.params.collectionId;
    const ownerId = req.user?._id;
    if (!ownerId) {
      return UnauthorizedErrorResponse(res, "User not authenticated");
    }
    const { name, description, tags, coverImage } = req.body;
    console.log("body = >", req.body);
    const result = await CollectionService.updateCollection({
      collectionId,
      ownerId,
      updateData: {
        name,
        description,
        tags,
        coverImage,
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
    printError(err);
    return ErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      COLLECTION_MESSAGES.INTERNAL_ERROR
    );
  }
};

export const httpGetCollectionsOfAStore = async (
  req: Request,
  res: Response
) => {
  try {
    const { search, tag, page, limit } = req.query;
    const storeId = req.params?.storeId;

    const result = await CollectionService.getCollectionOfAStore({
      storeId,
      search: search as string,
      tag: tag as string,
      page: parseInt(page as string) || 1,
      limit: parseInt(limit as string) || 10,
    });

    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (err) {
    printError(err);
    return ErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      COLLECTION_MESSAGES.INTERNAL_ERROR
    );
  }
};

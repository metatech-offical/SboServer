import { Request, Response } from "express";

import { STATUS_CODES } from "../../constants/statusCodes";
import { STORE_MESSAGES } from "../../constants/responseMessage";
import { StoreService } from "../../services";
import {
  ErrorResponse,
  printError,
  SuccessOKResponse,
  SuccessResponse,
  UnauthorizedErrorResponse,
} from "../../utils/responseHandler";
import { generateMerchandisePreSignedUrl } from "../../models/store/helper";

export const httpCreateStore = async (req: Request, res: Response) => {
  try {
    const { name, bio, logo, banner } = req.body;
    const ownerId = req.user?._id;

    if (!ownerId) {
      return UnauthorizedErrorResponse(res, "User not authenticated");
    }
    const result = await StoreService.createStore({
      name,
      ownerId,
      bio,
      logo,
      banner,
    });

    return SuccessOKResponse(res, result.data);
  } catch (err) {
    printError(err, "httpCreateStore");
    return ErrorResponse(res);
  }
};

export const httpGetStores = async (req: Request, res: Response) => {
  try {
    const { search, page, limit } = req.query;

    const result = await StoreService.getStores({
      search: search as string,
      page: Number(page),
      limit: Number(limit),
    });

    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (err) {
    printError(err, "httpGetStores");
    return ErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      STORE_MESSAGES.INTERNAL_ERROR
    );
  }
};

export const httpGetStoreAnalytics = async (req: Request, res: Response) => {
  try {
    const ownerId = req.user?._id;

    if (!ownerId) {
      return UnauthorizedErrorResponse(res, "User not authenticated");
    }

    const result = await StoreService.getStoreAnalytics({ ownerId });

    return SuccessOKResponse(res, result.data, result.message);
  } catch (err) {
    printError(err, "httpGetStoreAnalytics");
    return ErrorResponse(res, STATUS_CODES.INTERNAL_SERVER_ERROR);
  }
};

export const httpGetMerchandisePresignedUrl = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.user?.id;
    const contentType = req.query.contentType as string;

    const result = await generateMerchandisePreSignedUrl(userId, contentType);
    return SuccessOKResponse(res, result.data);
  } catch (error) {
    printError(error, "httpGetMerchandisePresignedUrl");
    return ErrorResponse(res);
  }
};

export const httpGetGlobalReturnPolicy = async (
  req: Request,
  res: Response
) => {
  try {
    const ownerId = req.user?._id;

    if (!ownerId) {
      return UnauthorizedErrorResponse(res, "User not authenticated");
    }

    const result = await StoreService.getGlobalReturnPolicy({ ownerId });

    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (err) {
    printError(err, "httpGetGlobalReturnPolicy");
    return ErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      STORE_MESSAGES.INTERNAL_ERROR
    );
  }
};

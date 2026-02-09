import { Request, Response } from "express";
import { ShortsService } from "../../services";
import {
  ErrorResponse,
  printError,
  SuccessResponse,
} from "../../utils/responseHandler";
import { STATUS_CODES } from "../../constants/statusCodes";
import { SHORT_MESSAGES } from "../../constants/responseMessage";
import { extractKeyFromPresignedUrl, getPublicUrlFromS3 } from "../../lib/s3";
import { AWS_S3_BUCKET_NAME } from "../../config/environment";
import { AuthenticatedRequest } from "../../types/express";
import { EContentVisibility } from "../../types/enum";

/**
 * Controller function for creating shorts
 * @param req
 * @param res
 * @returns
 */
export const httpCreateShorts = async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const url = req.body?.videoUrl;
    const key = extractKeyFromPresignedUrl(url)?.replace(
      `${AWS_S3_BUCKET_NAME}/`,
      ""
    );
    const publicUrl = getPublicUrlFromS3(AWS_S3_BUCKET_NAME, key ?? "");
    const data = {
      creatorId: user._id as any,
      category: req.body.category,
      tags: req.body.tags,
      description: req.body.description,
      thumbnailUrl: req.body.thumbnailUrl,
      duration: req.body.duration,
      videoUrl: publicUrl,
      settings: {
        visibility: req.body.visibility || EContentVisibility.everyone,
      },
    };
    const result = await ShortsService.createShorts(data, user);
    if (!result) {
      return ErrorResponse(
        res,
        STATUS_CODES.INTERNAL_SERVER_ERROR,
        false,
        SHORT_MESSAGES.CREATION_FAILED
      );
    }

    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (error) {
    printError(error, "httpCreateShorts");
    return ErrorResponse(res);
  }
};

export const httpGetShortById = async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const { shortId } = req.params;
    const result = await ShortsService.getPopulatedShortById(
      shortId,
      String(user._id)
    );

    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (error) {
    printError(error, "httpCreateShorts");
    return ErrorResponse(res);
  }
};

export const httpDeleteShortById = async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const { shortId } = req.params;
    const result = await ShortsService.deleteShortById(
      shortId,
      String(user._id)
    );
    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (error) {
    printError(error, "httpDeleteShortById");
    return ErrorResponse(res);
  }
};

// Get shorts by category or creator
export const httpGetShorts = async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const { creatorId, categoryName, page, limit, search = "" } = req.query;
    const pageNumber = Number(page ?? 1);
    const limitNumber = Number(limit ?? 10);
    const result = await ShortsService.getShortsWithFilters(
      String(user._id),
      creatorId as string,
      search as string,
      categoryName as string,
      pageNumber,
      limitNumber,
      "filter"
    );

    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (error) {
    printError(error, "httpGetShorts");
    return ErrorResponse(res);
  }
};

export const httpGetRecommendedShorts = async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 10);
    const algorithmType = String(req.query.algorithm ?? "hybrid");

    const result = await ShortsService.getRecommendedShorts(
      String(user._id),
      page,
      limit,
      algorithmType
    );

    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (error) {
    printError(error, "httpGetRecommendedShorts");
    return ErrorResponse(res);
  }
};

export const httpGetTrendingShorts = async (req: Request, res: Response) => {
  try {
    const { page, limit } = req.query;
    const user = (req as AuthenticatedRequest).user;
    const result = await ShortsService.getTrendingShorts(
      String(user._id),
      Number(page),
      Number(limit)
    );
    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (error) {
    printError(error, "httpGetTrendingShorts");
    return ErrorResponse(res);
  }
};

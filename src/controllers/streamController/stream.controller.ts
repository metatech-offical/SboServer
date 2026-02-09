import { Request, Response } from "express";
import { StreamService } from "../../services";
import {
  ErrorResponse,
  printError,
  SuccessOKResponse,
  SuccessResponse,
} from "../../utils/responseHandler";
import { AuthenticatedRequest } from "../../types/express";
import { extractKeyFromPresignedUrl, getPublicUrlFromS3 } from "../../lib/s3";
import { AWS_S3_BUCKET_NAME } from "../../config/environment";
import { STATUS_CODES } from "../../constants/statusCodes";
import { getTrendingStreams } from "../../services/streamServices/stream.service";
import { IStream } from "../../models/stream/stream.type";
import { Stream } from "winston/lib/winston/transports";

export const httpCreateStream = async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const url = req.body.url;
    const key = extractKeyFromPresignedUrl(url)?.replace(
      `${AWS_S3_BUCKET_NAME}/`,
      ""
    );
    const publicUrl = getPublicUrlFromS3(AWS_S3_BUCKET_NAME, key ?? "");
    const videoId = publicUrl.match(/(\d+)\.mp4$/)?.[1] ?? "";
    const newStream = await StreamService.createStream({
      status: "uploaded",
      type: "video",
      videoUrl: publicUrl,
      creatorId: user._id,
      title: req.body.title,
      settings: { visibility: req.body.visibility },
      description: req.body.description,
      tags: req.body.tags,
      category: req.body.category,
      duration: req.body.duration,
      thumbnailUrl: req.body.thumbnailUrl,
    });
    return SuccessOKResponse(res, newStream);
  } catch (err) {
    printError(err, "httpCreateStream");
    return ErrorResponse(res);
  }
};

export const httpGetStreamById = async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const { streamId } = req.params;
    console.log("streamId - ", streamId);
    const result = await StreamService.getPopulatedStreamById(
      streamId,
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
    printError(error, "httpGetStreamById");
    return ErrorResponse(res);
  }
};

/**
 * Following controller function is responsible for deleting stream.
 * @param req we accept streamId and userId.
 * @param res Success and error responses.
 * @returns response object
 */
export const httpDeleteStream = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user._id;
    const streamId = req.params.streamId;

    const result = await StreamService.deleteStreamService(
      streamId.toString(),
      userId.toString()
    );

    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (error) {
    printError(error, "httpDeleteStream");
    return ErrorResponse(res);
  }
};

export const httpGetTrendingStreams = async (req: Request, res: Response) => {
  try {
    const { page, limit } = req.query;
    const userId = (req as AuthenticatedRequest).user._id;
    const result = await StreamService.getTrendingStreams(
      String(userId),
      Number(page),
      Number(limit)
    );
    return SuccessResponse<IStream[]>(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (error) {
    printError(error, "httpGetTrendingStreams");
    return ErrorResponse(res);
  }
};

export const httpGetStreams = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user._id;
    const { page, limit, categoryName, creatorId, type, search } = req.query;
    const result = await StreamService.getFilteredStreams(
      String(userId),
      creatorId as string,
      Number(page),
      Number(limit),
      type as "video" | "video-live" | "all",
      "filter",
      categoryName as string,
      search as string
    );

    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (error) {
    printError(error, "httpGetStreams");
    return ErrorResponse(res);
  }
};

export const httpInitiateUpload = async (req: Request, res: Response) => {
  try {
    const { fileName, contentType } = req.body;
    const userId = req.user!._id;

    if (!fileName || !contentType) {
      return ErrorResponse(
        res,
        400,
        false,
        "fileName and contentType are required"
      );
    }

    const result = await StreamService.initiateMultipartUpload(
      userId.toString(),
      fileName,
      contentType
    );

    return SuccessResponse(res, 200, true, "Upload session initiated", result);
  } catch (error) {
    printError(error, "httpInitiateUpload");
    return ErrorResponse(res, 500, false, "Failed to initiate upload");
  }
};

export const httpGeneratePresignedUrls = async (
  req: Request,
  res: Response
) => {
  try {
    const { uploadId, key, fileSize } = req.body;
    const userId = (req as AuthenticatedRequest).user._id;

    if (!uploadId || !key || !fileSize) {
      return ErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        false,
        "uploadId, key and fileSize are required"
      );
    }

    const result = await StreamService.generatePresignedUrls(
      userId.toString(),
      uploadId,
      key,
      fileSize
    );

    console.log("Presigned URLs generated:", result);

    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      "Presigned URLs generated",
      result
    );
  } catch (error) {
    printError(error, "httpGeneratePresignedUrls");
    return ErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      "Failed to generate presigned URLs"
    );
  }
};

export const httpCompleteUpload = async (req: Request, res: Response) => {
  try {
    const { uploadId, key, parts } = req.body;

    const userId = req.user!._id;

    if (!uploadId || !key || !parts) {
      return ErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        false,
        "uploadId, key, and parts are required"
      );
    }

    const result = await StreamService.completeMultipartUpload(
      userId.toString(),
      uploadId,
      key,
      parts
    );

    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      "Upload completed",
      result
    );
  } catch (error) {
    printError(error, "httpCompleteUpload");
    return ErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      "Failed to complete upload"
    );
  }
};

export const httpGetSubscribedStreams = async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id.toString();
    const { page, limit } = req.query as { page: string; limit: string };

    const result = await StreamService.getSubscribedStreams({
      userId,
      page: parseInt(page),
      limit: parseInt(limit),
    });

    return SuccessOKResponse(res, result.data, result.message);
  } catch (err) {
    printError(err, "httpGetSubscribedStreams");
    return ErrorResponse(res);
  }
};

export const httpGetStreamsForCarousel = async (
  req: Request,
  res: Response
) => {
  const userId = (req as AuthenticatedRequest).user._id;
  const { page, limit } = req.query;
  console.log("HTRjhgjlsdL:", page, limit);
  try {
    const result = await StreamService.streamsForCarousel(
      userId.toString(),
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
    printError(error, "httpGetStreamsForCarousel");
    return ErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      "Failed to fetch streams for carousel"
    );
  }
};

/**
 * Toggle saveVod flag for a stream
 * Allows user to choose whether to show/hide the VOD after stream ends
 */
export const httpToggleSaveVod = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user._id;
    const { streamId } = req.params;
    const { saveVod } = req.body;

    if (typeof saveVod !== "boolean") {
      return ErrorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        false,
        "saveVod must be a boolean"
      );
    }

    const result = await StreamService.toggleSaveVod(
      streamId,
      userId.toString(),
      saveVod
    );

    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (error) {
    printError(error, "httpToggleSaveVod");
    return ErrorResponse(res);
  }
};

/**
 * Get user's VODs (Video On Demand - recorded live streams)
 */
export const httpGetUserVods = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user._id;
    const { page, limit } = req.query;

    const result = await StreamService.getUserVods(
      userId.toString(),
      Number(page) || 1,
      Number(limit) || 10
    );

    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (error) {
    printError(error, "httpGetUserVods");
    return ErrorResponse(res);
  }
};

/**
 * Get VODs by creator ID
 * Allows users to see other creators' VODs
 */
export const httpGetCreatorVods = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user._id;
    const { creatorId } = req.params;
    const { page, limit } = req.query;

    const result = await StreamService.getCreatorVods(
      creatorId,
      userId.toString(),
      Number(page) || 1,
      Number(limit) || 10
    );

    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (error) {
    printError(error, "httpGetCreatorVods");
    return ErrorResponse(res);
  }
};

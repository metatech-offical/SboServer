import { Request, Response } from "express";
import { LiveStreamService } from "../../services";
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

export const httpCreateLiveStream = async (req: Request, res: Response) => {
  const userId = req.user!._id;

  try {
    const result = await LiveStreamService.createLiveStream(userId, req.body);
    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (error) {
    printError(error, "httpCreateLiveStream");
    return ErrorResponse(res);
  }
};

export const httpCloudRecording = async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    console.log(
      "ZegoCloud Recording Webhook received:",
      JSON.stringify(payload, null, 2)
    );

    const result = await LiveStreamService.handleRecordingWebhook(payload);

    if (!result.success) {
      return ErrorResponse(res, result.statusCode, false, result.message);
    }

    // Return 200 OK to acknowledge receipt
    return SuccessOKResponse(res, result.data, result.message);
  } catch (error) {
    printError(error, "httpCloudRecording");
    // Always return 200 to prevent ZegoCloud from retrying
    return SuccessOKResponse(res, null, "Webhook received");
  }
};
export const httpGetLiveStreamByUserId = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.params.userId;
    const result = await LiveStreamService.getLiveStreamByUserId(userId);

    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (error) {
    printError(error, "httpGetLiveStreamByUserId");
    return ErrorResponse(res);
  }
};

export const httpGetAllLiveStreams = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user._id;
    const { page = 1, limit = 10 } = req.query;

    const streams = await LiveStreamService.getAllLiveStreams(
      userId.toString(),
      Number(page),
      Number(limit)
    );

    return SuccessResponse(
      res,
      streams.statusCode,
      streams.success,
      streams.message,
      streams.data
    );
  } catch (error) {
    printError(error, "httpGetAllStreams");
    return ErrorResponse(res);
  }
};

export const httpStreamStarted = async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    console.log("This is payload::::::> ", payload);
    const result = await LiveStreamService.liveStreamStarted(payload);

    if (!result.success) {
      return ErrorResponse(res, result.statusCode, false, result.message);
    }

    return SuccessOKResponse(res, result.data, result.message);
  } catch (error) {
    printError(error, "httpStreamStarted");
    return ErrorResponse(res);
  }
};

export const httpStreamEnded = async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const result = await LiveStreamService.liveStreamEnded(payload);

    if (!result.success) {
      return ErrorResponse(res, result.statusCode, false, result.message);
    }

    return SuccessOKResponse(res, result.data, result.message);
  } catch (error) {
    printError(error, "httpStreamStarted");
    return ErrorResponse(res);
  }
};

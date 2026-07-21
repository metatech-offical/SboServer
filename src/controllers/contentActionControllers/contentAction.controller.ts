import { Request, Response } from "express";
import { EContentType } from "../../constants/collectionNames";
import {
  ContentCommentService,
  ContentActionService,
  ContentSaveService,
  ContentLikeService,
} from "../../services";
import {
  ErrorResponse,
  printError,
  SuccessOKResponse,
  SuccessResponse,
} from "../../utils/responseHandler";
import { generatePreSignedUrl, getPublicUrlFromS3 } from "../../lib/s3";
import { AWS_S3_BUCKET_NAME } from "../../config/environment";
import s3Client from "../../config/s3";
import { v4 as uuidv4 } from "uuid";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { AuthenticatedRequest } from "../../types/express";
import { INotInterested } from "../../models/contentActions/notInterested.schema";

export const httpAddViewOnContent = async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id;
    const contentId = req.params.contentId;
    const { ipAddress, contentType, userAgent } = req.body;

    const result = await ContentActionService.addContentView(
      contentType as EContentType,
      contentId,
      userId,
      ipAddress,
      userAgent
    );

    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (error) {
    printError(error, "httpAddOrRemoveViewOnContent");
    return ErrorResponse(res);
  }
};

export const httpLikeOrUnlikeContent = async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const contentId = req.params.contentId;
    const { contentType, action, creatorId } = req.body;

    const result = await ContentLikeService.likeOrUnlikeContent(
      contentId,
      contentType as EContentType,
      user
    );

    // const result = await ContentLikeService.redisLikeOperation(
    //   contentType,
    //   contentId,
    //   user,
    //   action as "like" | "unlike",
    //   creatorId
    // );

    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (error) {
    printError(error, "httpLikeOrUnlikeContent");
    return ErrorResponse(res);
  }
};

export const httpAddComment = async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const { creatorId, commentText, replyTo, contentType, contentId } =
      req.body;

    const result = await ContentCommentService.addComment(
      contentId,
      contentType as EContentType,
      creatorId,
      user,
      commentText,
      replyTo
    );

    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (err) {
    printError(err, "httpAddComment");
    return ErrorResponse(res);
  }
};

export const httpDeleteComment = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user._id;
    const commentId = req.params.commentId;
    const result = await ContentCommentService.deleteComment(
      commentId,
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
    printError(error, "httpDeleteComment");
    return ErrorResponse(res);
  }
};

export const httpGetCommentsByContentId = async (
  req: Request,
  res: Response
) => {
  try {
    const contentId = req.params.contentId;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const result = await ContentCommentService.getContentComments(
      contentId,
      page,
      limit
    );

    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (error) {
    printError(error, "httpGetCommentsByContentId");
    return ErrorResponse(res);
  }
};

export const httpGetCommentReplies = async (req: Request, res: Response) => {
  try {
    const commentId = req.params.commentId;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 5;

    const result = await ContentCommentService.getCommentReplies(
      commentId,
      page,
      limit
    );

    return SuccessOKResponse(res, result.data);
  } catch (error) {
    printError(error, "httpGetCommentReplies");
    return ErrorResponse(res);
  }
};

export const httpSaveOrUnsaveContent = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user._id;
    const contentId = req.params.contentId;
    const { action, contentType } = req.body;

    const result = await ContentSaveService.saveOrUnsaveContent(
      contentId,
      contentType as EContentType,
      userId.toString(),
      action
    );

    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (error) {
    printError(error, "httpSaveOrUnsaveContent");
    return ErrorResponse(res);
  }
};

export const httpGetUserSavedItems = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user._id;
    const { contentType } = req.params;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const result = await ContentSaveService.getUserSavedItems(
      userId.toString(),
      contentType as EContentType,
      page,
      limit
    );

    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (error) {
    printError(error, "httpGetCommentsByContentId");
    return ErrorResponse(res);
  }
};

export const httpCreateShareRecord = async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const { url, platform, contentType, contentId } = req.body;
    const newShare = await ContentActionService.createShare(
      user._id,
      url,
      contentId,
      contentType,
      platform
    );
    if (!newShare) {
      throw new Error("Failed to create share record");
    }

    return SuccessOKResponse(res, newShare);
  } catch (error: any) {
    printError(error, "httpCreateShareRecord");
    return ErrorResponse(res);
  }
};

export const httpCreateReport = async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const { contentId, contentType, reason, description = "" } = req.body;
    const result = await ContentActionService.createReport({
      contentId,
      contentType,
      reason,
      description,
      reporter: user._id,
    });
    return SuccessOKResponse(res, result, "Report submitted successfully");
  } catch (error) {
    printError(error, "httpCreateReport");
    return ErrorResponse(res);
  }
};

export const httpAddToNotInterested = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user._id;
    const { contentId, contentType } = req.body;

    const result = await ContentActionService.addToNotInterested(
      userId.toString(),
      contentId,
      contentType as EContentType
    );

    return SuccessResponse<INotInterested>(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (error) {
    printError(error, "httpAddToNotInterested");
    return ErrorResponse(res);
  }
};

export const httpRemoveFromNotInterested = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = (req as AuthenticatedRequest).user._id;
    const { contentId, contentType } = req.body;

    const result = await ContentActionService.removeFromNotInterested(
      userId.toString(),
      contentId,
      contentType as EContentType
    );

    return SuccessResponse<INotInterested>(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (error) {
    printError(error, "httpRemoveFromNotInterested");
    return ErrorResponse(res);
  }
};

export const httpUploadCover = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }

    const userId = (req as AuthenticatedRequest).user._id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const file = req.file;
    const mimeToExt: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/png": "png",
      "image/gif": "gif",
      "image/webp": "webp",
      "image/heic": "heic",
      "image/heif": "heif",
    };
    const extFromName = file.originalname.split(".").pop()?.toLowerCase();
    const fileExtension =
      (extFromName && extFromName.length <= 5 ? extFromName : null) ||
      mimeToExt[file.mimetype] ||
      "jpg";
    const fileName = `covers/${userId}/${uuidv4()}.${fileExtension}`;

    const params = {
      Bucket: AWS_S3_BUCKET_NAME,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    await s3Client.send(new PutObjectCommand(params));

    const imageUrl = getPublicUrlFromS3(AWS_S3_BUCKET_NAME, fileName);

    return SuccessOKResponse(res, imageUrl);
  } catch (error) {
    printError(error, "httpUploadCover");
    return ErrorResponse(res);
  }
};

export const httpGeneratePreSignedUrl = async (req: Request, res: Response) => {
  try {
    const type = req.query.type as EContentType;
    const user = (req as AuthenticatedRequest).user;
    const userId = String(user._id);
    const key = `${type}/${userId}/${Date.now()}.mp4`;
    const url = await generatePreSignedUrl(key);
    return SuccessOKResponse(res, url, "Presigned URL generated successfully");
  } catch (error) {
    printError(error, "httpGeneratePreSignedUrl");
    return ErrorResponse(res);
  }
};

import { Request, Response } from "express";
import { PostService } from "../../services";
import {
  ErrorResponse,
  printError,
  SuccessOKResponse,
} from "../../utils/responseHandler";
import { AuthenticatedRequest } from "../../types/express";

export const httpCreatePost = async (req: Request, res: Response) => {
  try {
    const { caption, tags, photoUrls } = req.body;
    const creator = (req as AuthenticatedRequest).user;

    const result = await PostService.createPost({
      creator,
      caption,
      tags,
      photoUrls,
    });

    return SuccessOKResponse(res, result.data);
  } catch (err) {
    printError(err, "httpCreatePost");
    return ErrorResponse(res);
  }
};

export const httpDeletePost = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const creatorId = req.user!._id.toString();

    const result = await PostService.deletePost({
      postId,
      creatorId,
    });

    if (!result.success) {
      return ErrorResponse(res, result.statusCode, false, result.message);
    }

    return SuccessOKResponse(res, result.data, result.message);
  } catch (err) {
    printError(err, "httpDeletePost");
    return ErrorResponse(res);
  }
};

export const httpGetPostsByUserId = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { page, limit, search } = req.query;
    const currentUserId = req.user?._id.toString();

    const result = await PostService.getPostsByUserId({
      userId,
      currentUserId,
      search: search as string,
      page: Number(page),
      limit: Number(limit),
    });

    return SuccessOKResponse(res, result.data, result.message);
  } catch (err) {
    printError(err, "httpGetPostsByUserId");
    return ErrorResponse(res);
  }
};

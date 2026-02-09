import { Request, Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../types/express";
import { ContentActionService } from "../services";
import { BadRequestErrorResponse } from "../utils/responseHandler";

export const contentActionMiddleware = {
  isContentReported: async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const user = (req as AuthenticatedRequest).user;
    const { contentId, contentType } = req.body;
    const exists = await ContentActionService.getReport(
      String(user._id),
      contentId,
      contentType
    );
    if (exists) {
      return BadRequestErrorResponse(
        res,
        "You have already reported this content!"
      );
    }
    next();
  },

  isMarkedNotInterested: async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const user = (req as AuthenticatedRequest).user;
    const { contentId, contentType } = req.body;
    const exists = await ContentActionService.alreadyMarkedNotInterested(
      String(user._id),
      contentId,
      contentType
    );
    if (exists) {
      return BadRequestErrorResponse(
        res,
        "You have already marked this content not interested!"
      );
    }
    next();
  },

  isValidContent: async (req: Request, res: Response, next: NextFunction) => {
    const { contentId } = req.params;
    const { contentType } = req.body;
    const result = await ContentActionService.getContentById(
      contentId as any,
      contentType
    );
    if (!result) {
      return BadRequestErrorResponse(res, "Content not found!");
    }
    next();
  },
};

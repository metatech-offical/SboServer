import { Request, Response } from "express";
import { NotificationService } from "../services";
import {
  ErrorResponse,
  printError,
  SuccessOKResponse,
  SuccessResponse,
} from "../utils/responseHandler";
import { AuthenticatedRequest } from "../types/express";

export const httpGetUserNotifications = async (req: Request, res: Response) => {
  try {
    const {
      type = "all",
      page = 1,
      limit = 20,
      fromDate,
      toDate,
      search = "",
    } = req.query;
    const userId = (req as AuthenticatedRequest).user._id;

    const result = await NotificationService.getUserNotifications(
      userId,
      type as string,
      Number(page),
      Number(limit),
      fromDate as string,
      toDate as string,
      search as string
    );

    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (err) {
    printError(err, "httpGetUserNotifications");
    return ErrorResponse(res);
  }
};

export const httpMarkNotificationsAsRead = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = (req as AuthenticatedRequest).user._id;
    const result = await NotificationService.markAsRead(userId.toString());

    return SuccessOKResponse(res, result);
  } catch (err) {
    printError(err, "httpMarkNotificationsAsRead");
    return ErrorResponse(res);
  }
};

export const httpGetUnreadNotificationsCount = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = (req as AuthenticatedRequest).user._id;
    const count = await NotificationService.getUnreadCount(userId.toString());
    return SuccessOKResponse(res, count);
  } catch (err) {
    printError(err, "httpGetUnreadNotificationsCount");
    return ErrorResponse(res);
  }
};

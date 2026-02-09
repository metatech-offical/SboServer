// src/middlewares/isCreator.ts
import { Request, Response, NextFunction } from "express";
import { STATUS_CODES } from "../constants/statusCodes";
import { ErrorResponse, printError } from "../utils/responseHandler";
import { MembershipLevel } from "../models/user/user.type";

export const isCreator = (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;

    if (!user || user.membership !== MembershipLevel.CREATOR) {
      return ErrorResponse(
        res,
        STATUS_CODES.FORBIDDEN,
        false,
        "You must be a creator to access this resource."
      );
    }

    return next();
  } catch (err) {
    printError(err, "isCreator Middleware");
    return ErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      "Internal server error while verifying creator access."
    );
  }
};

import { IUser } from "../../models/user/user.type";
import { Response, NextFunction, Request } from "express";

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

// Utility types for better type safety
export type AuthenticatedRequest = Request & {
  user: IUser; // Required, not optional
};

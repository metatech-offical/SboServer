import { Response } from "express";
import logger from "../config/logger";
import { STATUS_CODES } from "../constants/statusCodes";
import { MESSAGES } from "../constants/responseMessage";

export interface ApiResponse<T> {
  statusCode: number;
  success: boolean;
  message: string;
  data: T | null;
}

export interface ResponseType {
  success: boolean;
  message: string;
  data: any;
}
export const ResultDB = <T>(
  statusCode: number = STATUS_CODES.INTERNAL_SERVER_ERROR,
  success: boolean = false,
  message: string = MESSAGES.INTERNAL_SERVER_ERROR,
  data: T | null = null
): ApiResponse<T> => {
  return { statusCode, success, message, data };
};

export const SuccessResponse = <T>(
  res: Response,
  statusCode: number = 200,
  success: boolean,
  message: string,
  data: T | null = null
): Response<ResponseType> => {
  return res.status(statusCode).json({
    success: success,
    message,
    data,
  });
};

export const SuccessOKResponse = <T>(
  res: Response,
  data: T | null = null,
  message: string = MESSAGES.SUCCESS
): Response<ResponseType> => {
  return res.status(200).json({
    success: true,
    message,
    data,
  });
};

export const ErrorResponse = <T>(
  res: Response,
  statusCode: number = 500,
  success: boolean = false,
  message: string = "Internal Server Error",
  data: T | null = null
): Response<ResponseType> => {
  return res.status(statusCode).json({
    success: success,
    message,
    data,
  });
};

export const UnauthorizedErrorResponse = <T>(
  res: Response,
  message: string = MESSAGES.UNAUTHORIZED,
  data: T | null = null
): Response<ResponseType> => {
  return res.status(STATUS_CODES.UNAUTHORIZED).json({
    success: false,
    message,
    data,
  });
};

export const NotFoundErrorResponse = <T>(
  res: Response,
  message: string = MESSAGES.NOT_FOUND,
  success: boolean = false,
  data: T | null = null
): Response<ResponseType> => {
  return res.status(STATUS_CODES.NOT_FOUND).json({
    success,
    message,
    data,
  });
};

export const BadRequestErrorResponse = <T>(
  res: Response,
  message: string = "bad request",
  success: boolean = false,
  data: T | null = null
): Response<ResponseType> => {
  return res.status(STATUS_CODES.BAD_REQUEST).json({
    success,
    message,
  });
};

export const printError = (error: unknown, fn: string = "") => {
  logger.error(
    `Error in fn [${fn}] → ${
      error instanceof Error ? error.stack : JSON.stringify(error)
    }`
  );
};

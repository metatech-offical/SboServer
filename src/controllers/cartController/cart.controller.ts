import { Request, Response } from "express";
import { CartService } from "../../services";
import {
  BadRequestErrorResponse,
  ErrorResponse,
  printError,
  SuccessResponse,
} from "../../utils/responseHandler";
import { STATUS_CODES } from "../../constants/statusCodes";
import { MESSAGES } from "../../constants/responseMessage";

export const httpAddToCart = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return BadRequestErrorResponse(res, "User not authenticated");
    }
    const { productId, storeId, variant, quantity } = req.body;
    const result = await CartService.addToCart({
      userId,
      productId,
      storeId,
      variant,
      quantity,
    });

    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (err) {
    printError(err, "addToCart");
    return ErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};
export const httpGetCart = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return BadRequestErrorResponse(res, "User not authenticated");
    }
    const result = await CartService.getCart({ userId });

    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (err) {
    printError(err, "getCart");
    return ErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      MESSAGES.INTERNAL_SERVER_ERROR
    );
  }
};

export const httpRemoveFromCart = async (req: Request, res: Response) => {
  try {
    const { productId, variant } = req.body;
    const userId = req.user!._id;

    const result = await CartService.removeFromCart({
      userId,
      productId,
      variant,
    });

    if (!result.success) {
      return ErrorResponse(res, result.statusCode, false, result.message);
    }

    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (err) {
    printError(err, "httpRemoveFromCart");
    return ErrorResponse(res);
  }
};

export const httpClearCart = async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id;
    if (!userId) {
      return BadRequestErrorResponse(res, "User not authenticated");
    }

    const result = await CartService.clearCart({ userId });

    if (!result.success) {
      return ErrorResponse(res, result.statusCode, false, result.message);
    }

    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (err) {
    printError(err, "httpClearCart");
    return ErrorResponse(res);
  }
};

export const httpUpdateCartQuantity = async (req: Request, res: Response) => {
  try {
    const { productId, variant, quantity } = req.body;
    const userId = req.user!._id;

    const result = await CartService.updateCartQuantity({
      userId,
      productId,
      variant,
      quantity,
    });

    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (err) {
    printError(err, "httpUpdateCartQuantity");
    return ErrorResponse(res);
  }
};

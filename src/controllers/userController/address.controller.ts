// controllers/userAddress.controller.ts
import { Request, Response } from "express";

import { STATUS_CODES } from "../../constants/statusCodes";
import {
  ErrorResponse,
  NotFoundErrorResponse,
  SuccessResponse,
  UnauthorizedErrorResponse,
} from "../../utils/responseHandler";
import {
  MESSAGES,
  USER_ADDRESS_MESSAGES,
} from "../../constants/responseMessage";
import UserAddressService from "../../services/userService/userAddress.service";

export const createAddress = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    const result = await UserAddressService.createAddress({
      ...req.body,
      userId,
    });
    return SuccessResponse(
      res,
      STATUS_CODES.CREATED,
      true,
      USER_ADDRESS_MESSAGES.CREATED,
      result.data
    );
  } catch (err) {
    return ErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      USER_ADDRESS_MESSAGES.INTERNAL_ERROR
    );
  }
};

export const getAddresses = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return UnauthorizedErrorResponse(res, MESSAGES.UNAUTHORIZED);
    }
    const result = await UserAddressService.getAddresses(userId.toString());
    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      USER_ADDRESS_MESSAGES.FETCHED,
      result.data
    );
  } catch (err) {
    return ErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      USER_ADDRESS_MESSAGES.INTERNAL_ERROR
    );
  }
};

export const getAddressById = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return UnauthorizedErrorResponse(res, MESSAGES.UNAUTHORIZED);
    }
    const { addressId } = req.params;
    const result = await UserAddressService.getAddressById(
      userId.toString(),
      addressId
    );
    if (!result.data) {
      return NotFoundErrorResponse(res, USER_ADDRESS_MESSAGES.NOT_FOUND);
    }
    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      USER_ADDRESS_MESSAGES.FETCH_ONE,
      result.data
    );
  } catch (err) {
    return ErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      USER_ADDRESS_MESSAGES.INTERNAL_ERROR
    );
  }
};

export const updateAddress = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return UnauthorizedErrorResponse(res, MESSAGES.UNAUTHORIZED);
    }
    const { addressId } = req.params;
    const result = await UserAddressService.updateAddress(
      userId.toString(),
      addressId,
      req.body
    );
    if (!result.data) {
      return NotFoundErrorResponse(res, USER_ADDRESS_MESSAGES.NOT_FOUND);
    }
    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      USER_ADDRESS_MESSAGES.UPDATED,
      result.data
    );
  } catch (err) {
    return ErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      USER_ADDRESS_MESSAGES.INTERNAL_ERROR
    );
  }
};

export const deleteAddress = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return UnauthorizedErrorResponse(res, MESSAGES.UNAUTHORIZED);
    }
    const { addressId } = req.params;
    const result = await UserAddressService.deleteAddress(
      userId.toString(),
      addressId
    );
    if (!result.data) {
      return NotFoundErrorResponse(res, USER_ADDRESS_MESSAGES.NOT_FOUND);
    }
    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      USER_ADDRESS_MESSAGES.DELETED,
      null
    );
  } catch (err) {
    return ErrorResponse(
      res,
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      USER_ADDRESS_MESSAGES.INTERNAL_ERROR
    );
  }
};

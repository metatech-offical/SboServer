import { Request, Response } from "express";
import { CategoryService } from "../../services";
import {
  ErrorResponse,
  printError,
  SuccessOKResponse,
} from "../../utils/responseHandler";

// Create interests in bulk
export const httpCreateCategory = async (
  req: Request,
  res: Response
) => {
  try {
    const data = await CategoryService.createCategory(req.body);

    if (!data.success) {
      return ErrorResponse(res, data.statusCode, false, data.message, null);
    }

    return SuccessOKResponse(res, data.data, data.message);
  } catch (err) {
    printError(err, "httpCreateInterestsInBulk");
    return ErrorResponse(res);
  }
};

// Create interests in bulk
export const httpCreateCategoriesInBulk = async (
  req: Request,
  res: Response
) => {
  try {
    const data = await CategoryService.createCategoriesInBulk(req.body);

    if (!data.success) {
      return ErrorResponse(res, data.statusCode, false, data.message, null);
    }

    return SuccessOKResponse(res, data.data, data.message);
  } catch (err) {
    printError(err, "httpCreateInterestsInBulk");
    return ErrorResponse(res);
  }
};

// Fetch interest list
export const httpFetchCategoriesList = async (_req: Request, res: Response) => {
  try {
    const data = await CategoryService.fetchCategoriesList();

    if (!data.success) {
      return ErrorResponse(res, data.statusCode, false, data.message, null);
    }

    return SuccessOKResponse(res, data.data, data.message);
  } catch (err) {
    printError(err, "httpFetchInterestsList");
    return ErrorResponse(res);
  }
};

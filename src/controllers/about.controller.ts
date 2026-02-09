import { Request, Response } from "express";
import { PRIVACY_POLICY, TOS } from "../constants/about";
import {
  ErrorResponse,
  printError,
  SuccessOKResponse,
} from "../utils/responseHandler";

export const httpGetPrivacyPolicy = async (req: Request, res: Response) => {
  try {
    return SuccessOKResponse(
      res,
      PRIVACY_POLICY,
      "Privacy policy fetched successfully"
    );
  } catch (e) {
    printError(e, "httpGetPrivacyPolicy");
    return ErrorResponse(res);
  }
};

export const httpGetTOS = async (req: Request, res: Response) => {
  try {
    return SuccessOKResponse(res, TOS, "TOS fetched successfully");
  } catch (e) {
    printError(e, "httpGetTOS");
    return ErrorResponse(res);
  }
};

import { Request, Response } from "express";
import {
  ErrorResponse,
  printError,
  SuccessOKResponse,
} from "../../utils/responseHandler";
import { CREATOR_SUBSCRIPTION_MESSAGES } from "../../constants/responseMessage";
import { SubscriptionService } from "../../services";
import { AuthenticatedRequest } from "../../types/express";

export const httpAddPlan = async (req: Request, res: Response) => {
  try {
    const creatorId = req.user!._id;
    const result = await SubscriptionService.addPlan({
      creatorId,
      ...req.body,
    });

    if (!result.success) {
      return ErrorResponse(res, result.statusCode, false, result.message);
    }

    return SuccessOKResponse(res, result.data, result.message);
  } catch (err) {
    printError(err, "httpAddPlan");
    return ErrorResponse(
      res,
      500,
      false,
      CREATOR_SUBSCRIPTION_MESSAGES.INTERNAL_ERROR
    );
  }
};

export const httpGetCreatorPlans = async (req: Request, res: Response) => {
  try {
    const { creatorId } = req.params;
    console.log("Fetching plans for creator:", creatorId);
    const result = await SubscriptionService.getPlans(creatorId);

    return SuccessOKResponse(res, result.data, result.message);
  } catch (err) {
    printError(err, "httpGetCreatorPlans");
    return ErrorResponse(
      res,
      500,
      false,
      CREATOR_SUBSCRIPTION_MESSAGES.INTERNAL_ERROR
    );
  }
};

export const httpSubscribe = async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const { planId } = req.body;

    const result = await SubscriptionService.subscribeToPlan({
      user,
      planId,
    });

    if (!result.success) {
      return ErrorResponse(res, result.statusCode, false, result.message);
    }

    return SuccessOKResponse(res, result.data, result.message);
  } catch (err) {
    printError(err, "httpSubscribe");
    return ErrorResponse(
      res,
      500,
      false,
      CREATOR_SUBSCRIPTION_MESSAGES.INTERNAL_ERROR
    );
  }
};

export const httpUnsubscribe = async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id.toString();
    const { creatorId } = req.body;

    const result = await SubscriptionService.unsubscribeFromCreator({
      userId,
      creatorId,
    });

    if (!result.success) {
      return ErrorResponse(res, result.statusCode, false, result.message);
    }

    return SuccessOKResponse(res, result.data, result.message);
  } catch (err) {
    printError(err, "httpUnsubscribe");
    return ErrorResponse(
      res,
      500,
      false,
      CREATOR_SUBSCRIPTION_MESSAGES.INTERNAL_ERROR
    );
  }
};

export const httpUpdatePlan = async (req: Request, res: Response) => {
  try {
    const creatorId = req.user!._id.toString();
    const { planId } = req.params;

    const result = await SubscriptionService.updatePlan({
      creatorId,
      planId,
      update: req.body,
    });

    if (!result.success) {
      return ErrorResponse(res, result.statusCode, false, result.message);
    }

    return SuccessOKResponse(res, result.data, result.message);
  } catch (err) {
    printError(err, "httpUpdatePlan");
    return ErrorResponse(
      res,
      500,
      false,
      CREATOR_SUBSCRIPTION_MESSAGES.INTERNAL_ERROR
    );
  }
};

export const httpDeletePlan = async (req: Request, res: Response) => {
  try {
    const creatorId = req.user!._id.toString();
    const { planId } = req.params;

    const result = await SubscriptionService.deletePlan({ creatorId, planId });

    if (!result.success) {
      return ErrorResponse(res, result.statusCode, false, result.message);
    }

    return SuccessOKResponse(res, result.data, result.message);
  } catch (err) {
    printError(err, "httpDeletePlan");
    return ErrorResponse(
      res,
      500,
      false,
      CREATOR_SUBSCRIPTION_MESSAGES.INTERNAL_ERROR
    );
  }
};

export const httpGetSubscribedCreators = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.user!._id.toString();
    const { search, page, limit, sort } = req.query as {
      search?: string;
      page: string;
      limit: string;
      sort: "asc" | "desc";
    };

    const result = await SubscriptionService.getSubscribedCreators({
      userId,
      search,
      page: parseInt(page),
      limit: parseInt(limit),
      sort,
    });

    return SuccessOKResponse(res, result.data, result.message);
  } catch (err) {
    printError(err, "httpGetSubscribedCreators");
    return ErrorResponse(
      res,
      500,
      false,
      CREATOR_SUBSCRIPTION_MESSAGES.INTERNAL_ERROR
    );
  }
};

export const httpGetSubscribers = async (req: Request, res: Response) => {
  try {
    const creatorId = req.user!._id.toString();
    const { search, page, limit, sort } = req.query as {
      search?: string;
      page: string;
      limit: string;
      sort: "asc" | "desc";
    };

    const result = await SubscriptionService.getSubscribers({
      creatorId,
      search,
      page: parseInt(page),
      limit: parseInt(limit),
      sort,
    });

    return SuccessOKResponse(res, result.data, result.message);
  } catch (err) {
    printError(err, "httpGetSubscribers");
    return ErrorResponse(
      res,
      500,
      false,
      CREATOR_SUBSCRIPTION_MESSAGES.INTERNAL_ERROR
    );
  }
};

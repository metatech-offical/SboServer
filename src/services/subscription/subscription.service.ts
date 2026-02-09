import { Types } from "mongoose";
import { CREATOR_SUBSCRIPTION_MESSAGES } from "../../constants/responseMessage";
import { STATUS_CODES } from "../../constants/statusCodes";
import {
  CreatorSubscriptionPlanModel,
  ICreatorSubscriptionPlan,
} from "../../models/subscription/creatorSubscriptionPlan.schema";
import { UserCreatorSubscriptionModel } from "../../models/subscription/userCreatorSubscriptions.schema";
import { ResultDB } from "../../utils/responseHandler";
import { NotificationService } from "..";
import {
  collectionNames,
  ENotificationContentType,
} from "../../constants/collectionNames";
import {
  NOTIFICATION_BODY,
  NOTIFICATION_TITLE,
} from "../../constants/notification";
import { IUser } from "../../models/user/user.type";
import { ENotificationType } from "../../models/notification/notification.types";
import { escapeRegex } from "../../utils/regex.helper";

const MAX_PLANS = 5;

export const addPlan = async ({
  creatorId,
  interval,
  currency,
  price,
  description,
}: {
  creatorId: string;
  interval: string;
  currency: string;
  price: number;
  description?: string;
}) => {
  const planCount = await CreatorSubscriptionPlanModel.countDocuments({
    creatorId,
  });
  if (planCount >= MAX_PLANS) {
    return ResultDB(
      STATUS_CODES.BAD_REQUEST,
      false,
      CREATOR_SUBSCRIPTION_MESSAGES.PLAN_LIMIT_REACHED
    );
  }

  const newPlan = await CreatorSubscriptionPlanModel.create({
    creatorId,
    interval,
    currency,
    price,
    description,
  });

  return ResultDB(
    STATUS_CODES.CREATED,
    true,
    CREATOR_SUBSCRIPTION_MESSAGES.PLAN_CREATED,
    newPlan
  );
};

export const getPlans = async (creatorId: string) => {
  const plans = await CreatorSubscriptionPlanModel.find({ creatorId });
  return ResultDB(
    STATUS_CODES.OK,
    true,
    CREATOR_SUBSCRIPTION_MESSAGES.PLANS_FETCHED,
    plans
  );
};

export const subscribeToPlan = async ({
  user,
  planId,
}: {
  user: IUser;
  planId: string;
}) => {
  const userId = String(user._id);
  const plan = await CreatorSubscriptionPlanModel.findById(planId);
  if (!plan) {
    return ResultDB(
      STATUS_CODES.NOT_FOUND,
      false,
      CREATOR_SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND
    );
  }

  const existing = await UserCreatorSubscriptionModel.findOne({
    userId,
    creatorId: plan.creatorId,
    status: "active",
  });

  if (existing) {
    return ResultDB(
      STATUS_CODES.BAD_REQUEST,
      false,
      CREATOR_SUBSCRIPTION_MESSAGES.ALREADY_SUBSCRIBED
    );
  }

  if (String(plan.creatorId) === userId) {
    return ResultDB(
      STATUS_CODES.NOT_FOUND,
      false,
      "You cannot subscribe yourself!"
    );
  }

  const now = new Date();
  const endDate = getSubscriptionEndDate(now, plan.interval);

  const newSub = await UserCreatorSubscriptionModel.create({
    userId,
    creatorId: plan.creatorId,
    planId,
    startDate: now,
    endDate,
    status: "active",
  });
  if (newSub) {
    await NotificationService.sendUniqueNotification({
      userId: String(plan.creatorId),
      senderId: userId,
      type: ENotificationType.subscribe,
      contentId: String(newSub._id),
      contentType:
        collectionNames.USER_CREATOR_SUBSCRIPTIONS as ENotificationContentType,
      notificationText: NOTIFICATION_BODY.USER_SUBSCRIBED(),
      pushNotificationContent: {
        title: NOTIFICATION_TITLE.USER_SUBSCRIBED,
        body: NOTIFICATION_BODY.USER_SUBSCRIBED(user.username),
      },
    });
  }

  return ResultDB(
    STATUS_CODES.CREATED,
    true,
    CREATOR_SUBSCRIPTION_MESSAGES.SUBSCRIBED,
    newSub
  );
};

export const unsubscribeFromCreator = async ({
  userId,
  creatorId,
}: {
  userId: string;
  creatorId: string;
}) => {
  const existing = await UserCreatorSubscriptionModel.findOne({
    userId,
    creatorId,
    status: "active",
  });

  if (!existing) {
    return ResultDB(
      STATUS_CODES.NOT_FOUND,
      false,
      CREATOR_SUBSCRIPTION_MESSAGES.NOT_SUBSCRIBED
    );
  }

  existing.status = "cancelled";
  existing.endDate = new Date();
  await existing.save();

  return ResultDB(
    STATUS_CODES.OK,
    true,
    CREATOR_SUBSCRIPTION_MESSAGES.UNSUBSCRIBED,
    existing
  );
};

const getSubscriptionEndDate = (startDate: Date, interval: string): Date => {
  const end = new Date(startDate);
  switch (interval) {
    case "monthly":
      end.setMonth(end.getMonth() + 1);
      break;
    case "quarterly":
      end.setMonth(end.getMonth() + 3);
      break;
    case "six_months":
      end.setMonth(end.getMonth() + 6);
      break;
    case "yearly":
      end.setFullYear(end.getFullYear() + 1);
      break;
    default:
      end.setMonth(end.getMonth() + 1);
      break;
  }
  return end;
};

export const updatePlan = async ({
  creatorId,
  planId,
  update,
}: {
  creatorId: string;
  planId: string;
  update: Partial<ICreatorSubscriptionPlan>;
}) => {
  const plan = await CreatorSubscriptionPlanModel.findById(planId);
  if (!plan) {
    return ResultDB(
      STATUS_CODES.NOT_FOUND,
      false,
      CREATOR_SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND
    );
  }

  if (plan.creatorId.toString() !== creatorId) {
    return ResultDB(
      STATUS_CODES.FORBIDDEN,
      false,
      CREATOR_SUBSCRIPTION_MESSAGES.UPDATE_UNAUTHORIZED
    );
  }

  Object.assign(plan, update);
  await plan.save();

  return ResultDB(
    STATUS_CODES.OK,
    true,
    CREATOR_SUBSCRIPTION_MESSAGES.UPDATED,
    plan
  );
};

export const deletePlan = async ({
  creatorId,
  planId,
}: {
  creatorId: string;
  planId: string;
}) => {
  const plan = await CreatorSubscriptionPlanModel.findById(planId);
  if (!plan) {
    return ResultDB(
      STATUS_CODES.NOT_FOUND,
      false,
      CREATOR_SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND
    );
  }

  if (plan.creatorId.toString() !== creatorId) {
    return ResultDB(
      STATUS_CODES.FORBIDDEN,
      false,
      CREATOR_SUBSCRIPTION_MESSAGES.DELETE_UNAUTHORIZED
    );
  }

  await plan.deleteOne();

  return ResultDB(
    STATUS_CODES.OK,
    true,
    CREATOR_SUBSCRIPTION_MESSAGES.DELETED,
    null
  );
};

export const getSubscribedCreators = async ({
  userId,
  search,
  page,
  limit,
  sort,
}: {
  userId: string;
  search?: string;
  page: number;
  limit: number;
  sort: "asc" | "desc";
}) => {
  const safeSearch = search ? escapeRegex(search) : undefined;
  const matchSubscription = {
    userId: new Types.ObjectId(userId),
    status: "active",
  };

  const matchCreator = {
    isDeleted: false,
    membership: "creator",
    ...(safeSearch && {
      $or: [
        { username: { $regex: safeSearch, $options: "i" } },
        { displayName: { $regex: safeSearch, $options: "i" } },
      ],
    }),
  };

  const skip = (page - 1) * limit;
  const sortOrder = sort === "asc" ? 1 : -1;

  // Aggregate creators user is subscribed to
  const [result] = await UserCreatorSubscriptionModel.aggregate([
    { $match: matchSubscription },
    {
      $lookup: {
        from: "users",
        localField: "creatorId",
        foreignField: "_id",
        as: "creator",
      },
    },
    { $unwind: "$creator" },
    {
      $match: {
        "creator.isDeleted": false,
        "creator.membership": "creator",
        ...(safeSearch && {
          $or: [
            { "creator.username": { $regex: safeSearch, $options: "i" } },
            { "creator.displayName": { $regex: safeSearch, $options: "i" } },
          ],
        }),
      },
    },
    {
      $sort: { createdAt: sortOrder },
    },
    {
      $facet: {
        data: [
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: "$creator._id",
              displayName: "$creator.displayName",
              username: "$creator.username",
              profilePicture: "$creator.profilePicture",
              subscriptionStart: "$startDate",
              subscriptionEnd: "$endDate",
            },
          },
        ],
        totalCount: [{ $count: "count" }],
      },
    },
  ]);

  return ResultDB(
    STATUS_CODES.OK,
    true,
    CREATOR_SUBSCRIPTION_MESSAGES.SUBSCRIBED_CREATORS_FETCHED,
    {
      total: result?.totalCount[0]?.count || 0,
      page,
      limit,
      data: result?.data || [],
    }
  );
};

export const getSubscribers = async ({
  creatorId,
  search,
  page,
  limit,
  sort,
}: {
  creatorId: string;
  search?: string;
  page: number;
  limit: number;
  sort: "asc" | "desc";
}) => {
  const safeSearch = search ? escapeRegex(search) : undefined;
  const matchSubscription = {
    creatorId: new Types.ObjectId(creatorId),
    status: "active",
  };

  const matchUser = {
    isDeleted: false,
    ...(safeSearch && {
      $or: [
        { username: { $regex: safeSearch, $options: "i" } },
        { displayName: { $regex: safeSearch, $options: "i" } },
      ],
    }),
  };

  const skip = (page - 1) * limit;
  const sortOrder = sort === "asc" ? 1 : -1;

  // Aggregate users who subscribed to the creator
  const [result] = await UserCreatorSubscriptionModel.aggregate([
    { $match: matchSubscription },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },
    {
      $match: {
        "user.isDeleted": false,
        ...(safeSearch && {
          $or: [
            { "user.username": { $regex: safeSearch, $options: "i" } },
            { "user.displayName": { $regex: safeSearch, $options: "i" } },
          ],
        }),
      },
    },
    {
      $sort: { createdAt: sortOrder },
    },
    {
      $facet: {
        data: [
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: "$user._id",
              displayName: "$user.displayName",
              username: "$user.username",
              profilePicture: "$user.profilePicture",
              subscriptionStart: "$startDate",
              subscriptionEnd: "$endDate",
            },
          },
        ],
        totalCount: [{ $count: "count" }],
      },
    },
  ]);

  return ResultDB(
    STATUS_CODES.OK,
    true,
    CREATOR_SUBSCRIPTION_MESSAGES.SUBSCRIBERS_FETCHED,
    {
      total: result?.totalCount[0]?.count || 0,
      page,
      limit,
      data: result?.data || [],
    }
  );
};

export const hasUserSubscribedCreator = async (
  userId: string,
  creatorId: string
) => {
  const hasSubscribed = await UserCreatorSubscriptionModel.findOne({
    userId,
    creatorId,
  });
  return hasSubscribed ? true : false;
};

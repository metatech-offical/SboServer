import mongoose, { Types } from "mongoose";
import { STATUS_CODES } from "../../constants/statusCodes";
import { ApiResponse, printError, ResultDB } from "../../utils/responseHandler";
import { EContentType } from "../../constants/collectionNames";
import {
  MESSAGES,
  POST_ACTION_MESSAGES,
} from "../../constants/responseMessage";
import ViewModel from "../../models/contentActions/view.schema";
import LikeModel from "../../models/contentActions/like.schema";
import ShareModel, {
  IContentShare,
} from "../../models/contentActions/share.schema";
import ReportModel, {
  IReport,
} from "../../models/contentActions/report.schema";
import NotInterestedModel, {
  INotInterested,
} from "../../models/contentActions/notInterested.schema";

export const addContentView = async (
  contentType: EContentType,
  contentId: string,
  userId: Types.ObjectId,
  ipAddress?: string,
  userAgent?: string
): Promise<ApiResponse<null>> => {
  try {
    const contentObjectId = new Types.ObjectId(contentId);

    // Use upsert to handle potential race conditions
    const result = await ViewModel.updateOne(
      { contentId: contentObjectId, userId },
      {
        $setOnInsert: {
          contentType,
          contentId: contentObjectId,
          userId,
          viewedAt: new Date(),
          ipAddress,
          userAgent,
        },
      },
      { upsert: true }
    );

    // Only increment count if a new view was created
    if (result.upsertedCount > 0) {
      const updatedContent = await mongoose
        .model(contentType)
        .findByIdAndUpdate(
          contentObjectId,
          { $inc: { viewsCount: 1 } },
          { new: true }
        );

      if (!updatedContent) {
        console.warn(
          `Content with ID ${contentId} not found while adding view`
        );
        return ResultDB(
          STATUS_CODES.NOT_FOUND,
          false,
          "Content not found",
          null
        );
      }
    }

    return ResultDB(STATUS_CODES.OK, true, "View added successfully!", null);
  } catch (error) {
    printError(error, "addOrRemoveView");
    return ResultDB(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      POST_ACTION_MESSAGES.ERROR_VIEW_ACTION,
      null
    );
  }
};

export const hasUserLikedContent = async (
  userId: string,
  contentId: string
): Promise<boolean> => {
  const result = await LikeModel.findOne({
    userId,
    contentId,
  });
  return !!result;
};

export const hasUserViewedContent = async (
  userId: string,
  contentId: string
): Promise<boolean> => {
  const result = await ViewModel.findOne({
    userId,
    contentId,
  });
  return !!result;
};

export const createShare = async (
  sharedBy: Types.ObjectId,
  url: string,
  contentId: Types.ObjectId,
  contentType: EContentType,
  platform?: string
): Promise<IContentShare> => {
  const share = new ShareModel({
    sharedBy,
    url,
    platform,
    contentId,
    contentType,
  });
  const newShare = await share.save();

  // Increase share count
  const shareCountIncreased = await increaseShareCount(
    String(contentId),
    contentType as EContentType
  );
  if (!shareCountIncreased) {
    throw new Error(`Failed to increase share count of ${contentType}`);
  }
  return newShare;
};

export const increaseShareCount = async (
  id: string,
  contentType: EContentType
): Promise<boolean> => {
  try {
    const objectId = new Types.ObjectId(id);
    await mongoose.model(contentType).findByIdAndUpdate(objectId, {
      $inc: { sharesCount: 1 },
    });
    return true;
  } catch (error) {
    printError(error, "increaseShareCount");
    return false;
  }
};

export const createReport = async (data: Partial<IReport>) => {
  const report = await ReportModel.create(data);
  return report;
};

export const addToNotInterested = async (
  userId: string,
  contentId: string,
  contentType: EContentType
): Promise<ApiResponse<INotInterested>> => {
  const item = await mongoose.model(contentType).findById(contentId);
  const ownerId = item?.creator?.toString();

  if (!item) {
    return ResultDB<INotInterested>(
      STATUS_CODES.NOT_FOUND,
      false,
      MESSAGES.NOT_FOUND,
      null
    );
  }

  if (ownerId === userId) {
    return ResultDB<INotInterested>(
      STATUS_CODES.FORBIDDEN,
      false,
      MESSAGES.FORBIDDEN,
      null
    );
  }

  const exists = await NotInterestedModel.findOne({
    userId,
    contentId,
    contentType,
  });
  if (exists) {
    return ResultDB<INotInterested>(
      STATUS_CODES.CONFLICT,
      false,
      "You have already added this content to not interested",
      null
    );
  }

  const notInterested = new NotInterestedModel({
    userId,
    contentId,
    contentType,
  });
  await notInterested.save();

  return ResultDB<INotInterested>(
    STATUS_CODES.CREATED,
    true,
    MESSAGES.SUCCESS,
    notInterested
  );
};

export const removeFromNotInterested = async (
  userId: string,
  contentId: string,
  contentType: EContentType
): Promise<ApiResponse<INotInterested>> => {
  const deleted = await NotInterestedModel.findOneAndDelete({
    userId,
    contentId,
    contentType,
  });
  if (!deleted) {
    return ResultDB<INotInterested>(
      STATUS_CODES.NOT_FOUND,
      false,
      MESSAGES.NOT_FOUND,
      null
    );
  }

  return ResultDB<INotInterested>(
    STATUS_CODES.OK,
    true,
    MESSAGES.SUCCESS,
    deleted
  );
};

export const getReport = (
  userId: string,
  contentId: string,
  contentType: EContentType
) => {
  return ReportModel.findOne({
    reporter: userId,
    contentId,
    contentType,
  });
};

export const alreadyMarkedNotInterested = (
  userId: string,
  contentId: string,
  contentType: EContentType
) => {
  return NotInterestedModel.findOne({
    userId,
    contentId,
    contentType,
  });
};

export const getContentById = async (
  contentId: string,
  contentType: EContentType
) => {
  const data = await mongoose.model(contentType).findById(contentId);
  console.log(data);
  return data;
};

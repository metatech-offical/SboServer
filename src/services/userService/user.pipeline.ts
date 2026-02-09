import { collectionNames, EContentType } from "../../constants/collectionNames";
import {
  isViewedPipeline,
  getIsUserLivePipeline,
  getFollowersCountPipeline,
  getFollowingCountPipeline,
  isFollowingPipeline,
  getIsBlockedPipeline,
  isSubscribedPipeline,
} from "../../utils/pipeline";
import mongoose from "mongoose";

export const getPopulatedUserPipeline = (
  targetUserId: string,
  currentUserId: string
) => {
  const targetUserObjId = new mongoose.Types.ObjectId(targetUserId);
  const currentUserObjId = new mongoose.Types.ObjectId(currentUserId);
  return [
    {
      $match: {
        _id: targetUserObjId,
        isDeleted: false,
      },
    },
    // Add isFollowing field using common pipeline
    ...isFollowingPipeline(currentUserId, "_id"),
    // Add followersCount using common pipeline
    ...getFollowersCountPipeline(),
    // Add followingCount using common pipeline
    ...getFollowingCountPipeline(),
    // Add isLive field using common pipeline
    ...getIsUserLivePipeline(),
    // Add isViewed field using common pipeline
    ...isViewedPipeline(currentUserId, EContentType.USER),
    // Add isSubscribed field using common pipeline
    ...isSubscribedPipeline(currentUserId, "_id"),
    // Lookup store information
    {
      $lookup: {
        from: collectionNames.STORE,
        let: { userId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$owner", "$$userId"] },
                  { $eq: ["$isActive", true] },
                ],
              },
            },
          },
          {
            $project: {
              _id: 1,
            },
          },
        ],
        as: "store",
      },
    },
    ...getIsBlockedPipeline(currentUserId),
    {
      $addFields: {
        storeId: {
          $cond: {
            if: { $gt: [{ $size: "$store" }, 0] },
            then: { $toString: { $arrayElemAt: ["$store._id", 0] } },
            else: "",
          },
        },
        // Handle case where user is viewing their own profile
        isFollowing: {
          $cond: {
            if: { $eq: ["$_id", currentUserObjId] },
            then: false, // Can't follow yourself, so always false
            else: "$isFollowing",
          },
        },
        // Handle case where user is viewing their own profile (can't be subscribed to yourself)
        isSubscribed: {
          $cond: {
            if: { $eq: ["$_id", currentUserObjId] },
            then: false, // Can't be subscribed to yourself, so always false
            else: "$isSubscribed",
          },
        },
      },
    },
    {
      $project: {
        password: 0,
        __v: 0,
        store: 0, // Remove the store array since we have storeId and individual store fields
      },
    },
  ];
};

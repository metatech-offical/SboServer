import { STATUS_CODES } from "../../constants/statusCodes";
import { IUser, MembershipLevel } from "../../models/user/user.type";
import { EProfileQueryType } from "../../types/enum";
import { ApiResponse, printError, ResultDB } from "../../utils/responseHandler";
import { VIEW_TRACKING_MESSAGES } from "../../constants/responseMessage";
import { MESSAGES } from "../../constants/responseMessage";
import mongoose, { Types } from "mongoose";
import UserModel from "../../models/user/user.schema";
import UserFollowModel from "../../models/user/userFollow.schema";
import UserBlockModel from "../../models/user/userBlock.schema";
import ViewModel from "../../models/contentActions/view.schema";
import { collectionNames, EContentType } from "../../constants/collectionNames";
import PostModel from "../../models/post/post.schema";
import ShortsModel from "../../models/short/short.schema";
import StreamModel from "../../models/stream/stream.schema";
import { Store } from "../../models/store/store.schema";
import PlaylistModel from "../../models/playlist/playlist.schema";
import { SavedItemModel } from "../../models/contentActions/save.schema";
import { UserCreatorSubscriptionModel } from "../../models/subscription/userCreatorSubscriptions.schema";
import CartModel from "../../models/cart/cart.schema";
import { escapeRegex } from "../../utils/regex.helper";
import { Wishlist } from "../../models/user/wishlisht.schema";
import {
  getFollowersCountPipeline,
  getIsUserLivePipeline,
  isSubscribedPipeline,
} from "../../utils/pipeline";
import {
  PlaylistService,
  ShortsService,
  PostService,
  StreamService,
  ContentViewService,
} from "..";
import { IPagination } from "../../types/schema";
import { getPopulatedUserPipeline } from "./user.pipeline";
import { OrderService } from "..";

export const createUser = async (
  user: Partial<IUser>
): Promise<IUser | null> => {
  return await UserModel.create(user);
};

export const getUserById = async (id: string): Promise<IUser | null> => {
  return await UserModel.findById(id, { password: 0, __v: 0 });
};

export const getUserByEmail = async (email: string): Promise<IUser | null> => {
  return await UserModel.findOne({ email, isDeleted: false });
};

export const getUserByUsername = async (
  username: string
): Promise<IUser | null> => {
  return await UserModel.findOne({ username, isDeleted: false });
};

export const getUserByPhoneNumber = async (
  phoneNumber: string
): Promise<IUser | null> => {
  return await UserModel.findOne({ phoneNumber, isDeleted: false });
};

export const updateUserMembership = (
  id: string,
  membership: MembershipLevel
) => {
  return UserModel.findByIdAndUpdate(id, { membership }, { new: true });
};

export const checkUsernameExists = async (
  username: string
): Promise<boolean> => {
  const user = await UserModel.findOne({ username, isDeleted: false });
  return !!user;
};

export const deleteUser = async (
  user: IUser,
  category: string,
  reason: string
) => {
  user.isDeleted = true;
  user.deletedReason.push({
    category,
    reason,
    deletedAt: new Date(),
  });

  const userId = user._id;

  // Delete user documents and mark content as deleted concurrently
  await Promise.all([
    // Delete user relationships
    UserFollowModel.deleteMany({
      $or: [{ followingId: userId }, { followerId: userId }],
    }),
    UserBlockModel.deleteMany({
      $or: [{ blocker: userId }, { blocked: userId }],
    }),
    // Mark all posts as deleted
    PostModel.updateMany(
      { creatorId: userId, isDeleted: false },
      { isDeleted: true }
    ),
    // Mark all shorts as deleted
    ShortsModel.updateMany(
      { creatorId: userId, deletedAt: null },
      { deletedAt: new Date() }
    ),
    // Mark all streams/videos as deleted
    StreamModel.updateMany(
      { creatorId: userId, isDeleted: false },
      { isDeleted: true }
    ),
    // Mark store as inactive
    Store.updateOne(
      { owner: userId },
      { isActive: false }
    ),
    // Delete all playlists
    PlaylistModel.deleteMany({ createdBy: userId }),
    // Delete all saved items
    SavedItemModel.deleteMany({ userId: userId }),
    // Cancel user's subscriptions (as subscriber)
    UserCreatorSubscriptionModel.updateMany(
      { userId: userId, status: "active" },
      { status: "cancelled" }
    ),
    // Cancel subscriptions to this creator (as creator)
    UserCreatorSubscriptionModel.updateMany(
      { creatorId: userId, status: "active" },
      { status: "cancelled" }
    ),
    // Clear cart
    CartModel.deleteOne({ userId: userId }),
    // Clear wishlist
    Wishlist.deleteMany({ userId: userId }),
    user.save(),
  ]);
};

export const getPopulatedUserById = async (
  targetUserId: string,
  currentUserId: string
): Promise<IUser | null> => {
  try {
    const pipeline = getPopulatedUserPipeline(targetUserId, currentUserId);
    const result = await UserModel.aggregate(pipeline);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    printError(error, "getPopulatedUserById");
    return null;
  }
};

// TODO:change comment things
export const getFavoriteCreators = async (
  userId: string,
  limit: number = 10,
  page: number = 1
): Promise<ApiResponse<{ creators: any[] }>> => {
  try {
    const skip = (page - 1) * limit;
    const favoriteCreators = await ViewModel.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          contentType: EContentType.USER,
        },
      },
      //TODO
      // Group by creator (contentId) and count views
      // {
      //   $group: {
      //     _id: "$contentId",
      //     viewCount: { $sum: 1 },
      //     lastViewed: { $max: "$viewedAt" },
      //   },
      // },
      // Sort by view count (descending) and then by last viewed (descending)
      {
        $sort: {
          viewCount: -1,
          lastViewed: -1,
        },
      },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: collectionNames.USER,
          localField: "contentId",
          foreignField: "_id",
          as: "creator",
        },
      },
      { $unwind: "$creator" },
      {
        $project: {
          creatorId: "$contentId",
          userId: 1,
          contentId: 1,
          viewCount: 1,
          contentType: 1,
          "creator._id": 1,
          "creator.username": 1,
          "creator.displayName": 1,
          "creator.profilePicture": 1,
          "creator.bio": 1,
          "creator.verified": 1,
        },
      },
    ]);

    return ResultDB(
      STATUS_CODES.OK,
      true,
      VIEW_TRACKING_MESSAGES.FAVORITE_CREATORS_FETCHED,
      {
        creators: favoriteCreators,
      }
    );
  } catch (error) {
    printError(error, "getFavoriteCreators");
    return ResultDB(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      MESSAGES.INTERNAL_SERVER_ERROR,
      { creators: [] }
    );
  }
};

// Subscription - visibility
// videoUrl empty
export const getSearchedUsers = async (
  search: string,
  page: number = 1,
  limit: number = 10
) => {
  const safeSearch = escapeRegex(search);
  return UserModel.aggregate([
    {
      $match: {
        username: { $regex: safeSearch, $options: "i" },
        isDeleted: false,
      },
    },
    ...getFollowersCountPipeline(),
    ...getIsUserLivePipeline(),
    {
      $project: {
        username: 1,
        profilePicture: 1,
        displayName: 1,
        verified: 1,
        followersCount: 1,
        isLive: 1,
      },
    },
  ]);
};

export const getUserProfileContent = async (
  type: EProfileQueryType,
  targetUserId: string,
  currentUserId: string,
  limit: number,
  page: number,
  search = ""
): Promise<{
  data: any;
  pagination: IPagination | null;
}> => {
  let res: ApiResponse<any> | { data: any; pagination: null } | undefined;
  switch (type) {
    case EProfileQueryType.SHORTS: {
      const shortsRes = await ShortsService.getShortsWithFilters(
        currentUserId,
        targetUserId,
        search,
        undefined,
        page,
        limit,
        targetUserId === currentUserId ? "" : "nullify"
      );
      res = shortsRes;
      break;
    }
    case EProfileQueryType.PLAYLISTS: {
      const playlistsRes = await PlaylistService.getFilteredPlaylists({
        userId: targetUserId,
        page,
        limit,
        search,
      });

      res = playlistsRes;
      break;
    }
    case EProfileQueryType.POSTS: {
      const postsRes = await PostService.getFilteredPosts(
        currentUserId,
        targetUserId,
        search,
        page,
        limit
      );
 
      res = postsRes;
      break;
    }
    case EProfileQueryType.VIDEOS: {
      const videosRes = await StreamService.getFilteredStreams(
        currentUserId,
        targetUserId,
        page,
        limit,
        "video",
        targetUserId === currentUserId ? "" : "nullify"
      );

      res = videosRes;
      break;
    }
    case EProfileQueryType.LIVE_VIDEO: {
      const liveVideosRes = await StreamService.getFilteredStreams(
        currentUserId,
        targetUserId,
        page,
        limit,
        "video-live",
        targetUserId === currentUserId ? "" : "nullify"
      );

      res = liveVideosRes;
      break;
    }
    case EProfileQueryType.HOME: {
      const popularStreamsData = await StreamService.getFilteredStreams(
        currentUserId,
        targetUserId,
        page,
        limit,
        "video",
        targetUserId === currentUserId ? "" : "nullify",
        undefined,
        undefined,
        { viewsCount: -1, createdAt: -1 } // Sort by views count (descending), then by creation date
      );

      const latestStreamsData = await StreamService.getFilteredStreams(
        currentUserId,
        targetUserId,
        page,
        limit,
        "video",
        targetUserId === currentUserId ? "" : "nullify",
        undefined,
        undefined,
        { createdAt: -1 } // Sort by creation date (descending) for latest
      );
      res = {
        data: {
          popularStreamsData: {
            ...popularStreamsData.data,
          },
          latestStreamsData: {
            ...latestStreamsData.data,
          },
        },
        pagination: null,
      };

      break;
    }
  }

  const data =
    res?.data?.data || //any[] = for other sections than home
    res?.data || //popularStreamsData and latestStreamsData - for home section
    []; //default
  const pagination = res?.data?.pagination || null;
  return {
    data,
    pagination,
  };
};

export const getUserStatistics = async (userId: string) => {
  const totalWatchedVideos = await ContentViewService.userWatchStats(userId);
  const tickets = 0; //TODO: wil be implemented with ticket module
  const totalOrders = await OrderService.getUserOrdersCount(userId);
  return {
    totalWatchedVideos,
    tickets,
    totalOrders,
  };
};

export const getSuggestedAccounts = async ({
  userId,
  page = 1,
  limit = 10,
}: {
  userId: string;
  page?: number;
  limit?: number;
}): Promise<ApiResponse<{ data: any[]; pagination: IPagination }>> => {
  const userObjectId = new Types.ObjectId(userId);
  const skip = (page - 1) * limit;

  // 1. Get people this user already follows
  const following = await UserFollowModel.find({
    followerId: userObjectId,
  }).select("followingId");

  const followingIds = following.map((f) => f.followingId);

  // 2. Get people this user blocked
  const blocked = await UserBlockModel.find({
    blocker: userObjectId,
  }).select("blocked");

  const blockedIds = blocked.map((b) => b.blocked);

  // 3. Define match condition
  const matchCondition = {
    _id: { $nin: [...followingIds, ...blockedIds, userObjectId] },
    isDeleted: false,
  };

  // 3. Aggregate users who are not followed, not blocked, not deleted
  const suggested = await UserModel.aggregate([
    {
      $match: matchCondition,
    },
    {
      // add engagement score (views+likes+shares+comments)
      $lookup: {
        from: "streams",
        localField: "_id",
        foreignField: "creatorId",
        as: "streams",
      },
    },
    ...isSubscribedPipeline(userId, "_id"),
    {
      $addFields: {
        engagementScore: {
          $add: [
            { $sum: "$streams.viewsCount" },
            { $sum: "$streams.likesCount" },
            "$sharesCount",
          ],
        },
        isSubscribed: {
          $cond: [
            { $eq: ["$_id", userId] },
            false, // Can't be subscribed to yourself, so always false
            "$isSubscribed",
          ],
        },
      },
    },
    { $sort: { engagementScore: -1, verified: -1 } },
    { $skip: skip },
    { $limit: limit },
    {
      $project: {
        _id: 1,
        displayName: 1,
        username: 1,
        profilePicture: 1,
        bio: 1,
        engagementScore: 1,
        verified: 1,
        isSubscribed:1,

      },
    },
  ]);

  // 4. Get total count
  const totalRecords = await UserModel.countDocuments(matchCondition);
  const totalPages = Math.ceil(totalRecords / limit);

  return ResultDB(STATUS_CODES.OK, true, MESSAGES.SUCCESS, {
    data: suggested,
    pagination: {
      totalPages,
      totalRecords,
      currentPage: page,
      limit,
    },
  });
};

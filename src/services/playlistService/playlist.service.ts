import mongoose, { Types } from "mongoose";
import PlaylistModel, {
  IPlaylist,
} from "../../models/playlist/playlist.schema";
import { STATUS_CODES } from "../../constants/statusCodes";
import { MESSAGES, PLAYLIST_MESSAGES } from "../../constants/responseMessage";
import { ApiResponse, printError, ResultDB } from "../../utils/responseHandler";
import { EContentType } from "../../constants/collectionNames";
import { IPagination } from "../../types/schema";
import { DEFAULT_DATA_WITH_PAGINATION } from "../../constants";
import { getPopulatedPlaylistPipeline } from "./playlist.pipeline";
import { escapeRegex } from "../../utils/regex.helper";

export const createPlaylist = async ({
  title,
  description,
  createdBy,
}: {
  title: string;
  description?: string;
  createdBy: Types.ObjectId;
}): Promise<ApiResponse<IPlaylist>> => {
  const playlist = await PlaylistModel.create({
    title,
    description,
    createdBy,
  });
  return ResultDB(
    STATUS_CODES.CREATED,
    true,
    PLAYLIST_MESSAGES.CREATED,
    playlist
  );
};

export const deletePlaylist = async (
  playlistId: string,
  userId: string
): Promise<ApiResponse<null>> => {
  try {
    const playlist = await PlaylistModel.findById(playlistId).select(
      "createdBy"
    );

    if (!playlist) {
      return ResultDB(
        STATUS_CODES.NOT_FOUND,
        false,
        PLAYLIST_MESSAGES.NOT_FOUND,
        null
      );
    }

    if (playlist.createdBy.toString() !== userId.toString()) {
      return ResultDB(
        STATUS_CODES.FORBIDDEN,
        false,
        MESSAGES.UNAUTHORIZED,
        null
      );
    }

    await PlaylistModel.findByIdAndDelete(playlistId);
    return ResultDB(STATUS_CODES.OK, true, PLAYLIST_MESSAGES.DELETED, null);
  } catch (error) {
    printError(error, "deletePlaylist");
    return ResultDB();
  }
};

export const addItemsToPlaylist = async ({
  playlistId,
  items,
}: {
  playlistId: string;
  items: {
    contentId: string;
    contentType: EContentType.STREAM | EContentType.SHORT;
  }[];
}): Promise<ApiResponse<IPlaylist>> => {
  const itemstoInsert = items.map((item) => ({
    contentId: new mongoose.Types.ObjectId(item.contentId),
    contentType: item.contentType,
  }));

  const playlist = await PlaylistModel.findByIdAndUpdate(
    playlistId,
    {
      $addToSet: {
        items: { $each: itemstoInsert },
      },
    },
    { new: true }
  );

  if (!playlist) {
    return ResultDB(STATUS_CODES.NOT_FOUND, false, PLAYLIST_MESSAGES.NOT_FOUND);
  }

  return ResultDB(
    STATUS_CODES.OK,
    true,
    PLAYLIST_MESSAGES.ITEM_ADDED,
    playlist
  );
};

export const removeItemFromPlaylist = async ({
  playlistId,
  contentId,
  contentType,
}: {
  playlistId: string;
  contentId: string;
  contentType: EContentType.STREAM | EContentType.SHORT;
}): Promise<ApiResponse<IPlaylist>> => {
  const playlist = await PlaylistModel.findById(playlistId);

  if (!playlist) {
    return ResultDB(STATUS_CODES.NOT_FOUND, false, PLAYLIST_MESSAGES.NOT_FOUND);
  }

  const index = playlist.items.findIndex(
    (item) =>
      item.contentId.toString() === contentId &&
      item.contentType === contentType
  );

  if (index === -1) {
    return ResultDB(
      STATUS_CODES.NOT_FOUND,
      false,
      PLAYLIST_MESSAGES.ITEM_NOT_FOUND
    );
  }

  playlist.items.splice(index, 1);
  await playlist.save();

  return ResultDB(
    STATUS_CODES.OK,
    true,
    PLAYLIST_MESSAGES.ITEM_REMOVED,
    playlist
  );
};

export const updatePlaylist = async ({
  playlistId,
  title,
  description,
}: {
  playlistId: string;
  title?: string;
  description?: string;
}): Promise<ApiResponse<IPlaylist>> => {
  const playlist = await PlaylistModel.findById(playlistId);
  if (!playlist) {
    return ResultDB(STATUS_CODES.NOT_FOUND, false, PLAYLIST_MESSAGES.NOT_FOUND);
  }

  if (title) playlist.title = title;
  if (description) playlist.description = description;
  await playlist.save();

  return ResultDB(STATUS_CODES.OK, true, PLAYLIST_MESSAGES.UPDATED, playlist);
};

export const getPlaylistById = async ({
  playlistId,
  userId,
}: {
  playlistId: string;
  userId: string;
}): Promise<ApiResponse<any>> => {
  const pipeline = getPopulatedPlaylistPipeline(playlistId);
  const result = await PlaylistModel.aggregate(pipeline);
  if (result.length === 0) {
    return ResultDB(STATUS_CODES.NOT_FOUND, false, PLAYLIST_MESSAGES.NOT_FOUND);
  }
  return ResultDB(STATUS_CODES.OK, true, PLAYLIST_MESSAGES.FETCHED, result[0]);
};

export const getFilteredPlaylists = async ({
  userId = "",
  page = 1,
  limit = 10,
  search = "",
}: {
  userId?: string;
  page?: number;
  limit?: number;
  search?: string;
}): Promise<ApiResponse<{ data: IPlaylist[]; pagination: IPagination }>> => {
  try {
    const skip = (page - 1) * limit;

    const matchCondition: any = {};
    if (userId) {
      matchCondition.createdBy = new Types.ObjectId(userId);
    }

    if (search.trim()) {
      const regex = new RegExp(escapeRegex(search), "i");
      matchCondition.$or = [{ title: regex }, { description: regex }];
    }

    const [playlists, totalCountArr] = await Promise.all([
      PlaylistModel.aggregate([
        { $match: matchCondition },
        {
          $lookup: {
            from: "users",
            localField: "createdBy",
            foreignField: "_id",
            as: "creator",
            pipeline: [
              {
                $match: {
                  isDeleted: false,
                },
              },
            ],
          },
        },
        {
          $match: {
            "creator.0": { $exists: true },
          },
        },
        {
          $project: {
            _id: 1,
            title: 1,
            description: 1,
            createdAt: 1,
            createdBy: 1,
            updatedAt: 1,
            itemsCount: { $size: "$items" },
          },
        },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
      ]),
      PlaylistModel.aggregate([
        { $match: matchCondition },
        {
          $lookup: {
            from: "users",
            localField: "createdBy",
            foreignField: "_id",
            as: "creator",
            pipeline: [
              {
                $match: {
                  isDeleted: false,
                },
              },
            ],
          },
        },
        {
          $match: {
            "creator.0": { $exists: true },
          },
        },
        { $count: "total" },
      ]),
    ]);

    const totalRecords = totalCountArr[0]?.total || 0;
    const totalPages = Math.ceil(totalRecords / limit);

    return ResultDB(STATUS_CODES.OK, true, PLAYLIST_MESSAGES.FETCHED, {
      data: playlists,
      pagination: {
        totalRecords,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    printError(error, "getFilteredPlaylists");
    return ResultDB(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      MESSAGES.INTERNAL_SERVER_ERROR,
      DEFAULT_DATA_WITH_PAGINATION
    );
  }
};

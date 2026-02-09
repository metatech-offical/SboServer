import { Types } from "mongoose";
import { Store } from "../../models/store/store.schema";
import { STATUS_CODES } from "../../constants/statusCodes";
import { ResultDB } from "../../utils/responseHandler";
import { STORE_MESSAGES } from "../../constants/responseMessage";
import { escapeRegex } from "../../utils/regex.helper";

export const createStore = async ({
  name,
  ownerId,
  bio,
  logo,
  banner,
}: {
  name: string;
  ownerId: Types.ObjectId;
  bio?: string;
  logo?: string;
  banner?: string;
}) => {
  const existing = await Store.findOne({ owner: ownerId });
  if (existing) {
    return ResultDB(
      STATUS_CODES.CONFLICT,
      false,
      STORE_MESSAGES.ALREADY_EXISTS,
      null
    );
  }

  const store = await Store.create({
    name,
    bio,
    logo,
    banner,
    owner: ownerId,
  });

  return ResultDB(STATUS_CODES.CREATED, true, STORE_MESSAGES.CREATED, store);
};

export const getStoreByOwnerId = (ownerId: Types.ObjectId) => {
  return Store.findOne({ owner: ownerId });
};

export const getStores = async ({
  search,
  page = 1,
  limit = 10,
}: {
  search?: string;
  page?: number;
  limit?: number;
}) => {
  const skip = (page - 1) * limit;
  // We'll search by creator name (join with user)
  const matchStage: any = { isActive: true };
  if (search) {
    const safeSearch = escapeRegex(search);
    matchStage["ownerDetails.username"] = { $regex: safeSearch, $options: "i" };
  }

  const stores = await Store.aggregate([
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
      },
    },
    { $unwind: "$ownerDetails" },
    { 
      $match: {
        ...matchStage,
        "ownerDetails.isDeleted": false,
      }
    },
    {
      $project: {
        name: 1,
        logo: 1,
        banner: 1,
        collectionsCount: 1,
        totalProducts: 1,
        ownerName: "$ownerDetails.username",
      },
    },
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limit },
  ]);

  return ResultDB(STATUS_CODES.OK, true, STORE_MESSAGES.FETCHED, stores);
};

export const getStoreAnalytics = async ({
  ownerId,
}: {
  ownerId: Types.ObjectId;
}) => {
  const store = await Store.findOne({ owner: ownerId }).lean();

  if (!store) {
    return ResultDB(
      STATUS_CODES.NOT_FOUND,
      false,
      STORE_MESSAGES.STORE_NOT_FOUND
    );
  }

  return ResultDB(STATUS_CODES.OK, true, "Store stats fetched", {
    totalProducts: store.totalProducts,
    liveProducts: store.liveProducts,
    outOfStockProducts: store.outOfStockProducts,
    totalCollections: store.collectionsCount,
  });
};

export const getStoreById = async (id: string) => {
  const store = await Store.findById(id);
  return store;
};

export const getGlobalReturnPolicy = async ({
  ownerId,
}: {
  ownerId: Types.ObjectId;
}) => {
  const store = await Store.findOne({ owner: ownerId })
    .select("globalReturnPolicy")
    .lean();

  if (!store) {
    return ResultDB(
      STATUS_CODES.NOT_FOUND,
      false,
      STORE_MESSAGES.STORE_NOT_FOUND
    );
  }

  return ResultDB(STATUS_CODES.OK, true, "Return policy fetched", {
    returnPolicy: store.globalReturnPolicy || null,
  });
};

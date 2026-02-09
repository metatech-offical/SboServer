// src/services/store/storeCollection.service.ts
import { FilterQuery, Types } from "mongoose";
import { Store } from "../../models/store/store.schema";
import { StoreCollection } from "../../models/store/storeCollection.schema";
import { STATUS_CODES } from "../../constants/statusCodes";
import { ResultDB } from "../../utils/responseHandler";
import { COLLECTION_MESSAGES } from "../../constants/responseMessage";
import { IStoreCollection } from "../../models/store/store.types";
import { getCreatorStore, getStoreById } from "../../models/store/helper";
import mongoose from "mongoose";
import path from "path";
import { escapeRegex } from "../../utils/regex.helper";

export const createCollection = async ({
  name,
  description,
  tags,
  coverImage,
  ownerId,
}: {
  name: string;
  description?: string;
  tags?: string[];
  coverImage?: string;
  ownerId: Types.ObjectId;
}) => {
  const store = await getCreatorStore(ownerId);
  if ("statusCode" in store) return store;

  const existing = await StoreCollection.findOne({ store: store._id, name });
  if (existing) {
    return ResultDB(
      STATUS_CODES.CONFLICT,
      false,
      COLLECTION_MESSAGES.ALREADY_EXISTS,
      null
    );
  }

  const collection = await StoreCollection.create({
    name,
    description,
    tags,
    coverImage,
    store: store._id,
  });

  // Increment store's collectionsCount
  await Store.findByIdAndUpdate(store._id, { $inc: { collectionsCount: 1 } });

  return ResultDB(
    STATUS_CODES.CREATED,
    true,
    COLLECTION_MESSAGES.CREATED,
    collection
  );
};

export const getCollections = async ({
  ownerId,
  search,
  tag,
  page = 1,
  limit = 10,
}: {
  ownerId: Types.ObjectId;
  search?: string;
  tag?: string;
  page?: number;
  limit?: number;
}) => {
  const store = await getCreatorStore(ownerId);
  if ("statusCode" in store) return store;

  const query: FilterQuery<IStoreCollection> = { store: store._id };

  if (search) {
    query.name = { $regex: escapeRegex(search), $options: "i" };
  }

  if (tag) {
    query.tags = tag;
  }

  const collections = await StoreCollection.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return ResultDB(
    STATUS_CODES.OK,
    true,
    COLLECTION_MESSAGES.FETCHED,
    collections
  );
};

export const getCollectionsFromAllStores = async ({
  currentUserId,
  search,
  tag,
  page = 1,
  limit = 10,
}: {
  currentUserId: Types.ObjectId;
  search?: string;
  tag?: string;
  page?: number;
  limit?: number;
}) => {
  const filter: any = {};

  if (search) {
    filter.name = { $regex: search, $options: "i" };
  }

  if (tag) {
    filter.tags = tag;
  }

  const [collections, totalCount] = await Promise.all([
    StoreCollection.find(filter)
      .populate({
        path: "store",
        select: "name owner",
        populate: {
          path: "owner",
          select: "username profilePicture displayName",
        },
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),

    StoreCollection.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  return ResultDB(STATUS_CODES.OK, true, COLLECTION_MESSAGES.FETCHED, {
    collections,
    pagination: {
      totalCount,
      totalPages,
      currentPage: page,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  });
};

/**
 * Get a collection by ID
 * @param param0
 * @returns
 */
export const getCollectionById = async ({
  collectionId,
  ownerId,
}: {
  collectionId: string;
  ownerId: Types.ObjectId;
}) => {
  const store = await getCreatorStore(ownerId);
  if ("statusCode" in store) return store;

  // Check if collection exists and belongs to the store
  const collection = await StoreCollection.findOne({
    _id: collectionId,
    store: store._id,
  }).lean();

  if (!collection) {
    return ResultDB(
      STATUS_CODES.NOT_FOUND,
      false,
      COLLECTION_MESSAGES.COLLECTION_NOT_FOUND
    );
  }

  return ResultDB(
    STATUS_CODES.OK,
    true,
    COLLECTION_MESSAGES.FETCHED,
    collection
  );
};

/**
 * Update a collection by ID
 * @param param0
 * @returns
 */
export const updateCollection = async ({
  collectionId,
  ownerId,
  updateData,
}: {
  collectionId: string;
  ownerId: Types.ObjectId;
  updateData: {
    name?: string;
    description?: string;
    tags?: string[];
    coverImage?: string;
  };
}) => {
  const store = await getCreatorStore(ownerId);
  if ("statusCode" in store) return store;

  // Check if collection exists and belongs to the store
  const existingCollection = await StoreCollection.findOne({
    _id: collectionId,
    store: store._id,
  });

  if (!existingCollection) {
    return ResultDB(
      STATUS_CODES.NOT_FOUND,
      false,
      COLLECTION_MESSAGES.COLLECTION_NOT_FOUND
    );
  }

  // If name is being updated, check for duplicate names in the same store
  if (updateData.name && updateData.name !== existingCollection.name) {
    const duplicateCollection = await StoreCollection.findOne({
      store: store._id,
      name: updateData.name,
      _id: { $ne: collectionId },
    });

    if (duplicateCollection) {
      return ResultDB(
        STATUS_CODES.CONFLICT,
        false,
        COLLECTION_MESSAGES.ALREADY_EXISTS
      );
    }
  }

  // Update the collection
  const updatedCollection = await StoreCollection.findByIdAndUpdate(
    collectionId,
    { $set: updateData },
    { new: true, runValidators: true }
  );

  if (!updatedCollection) {
    return ResultDB(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      COLLECTION_MESSAGES.UPDATE_FAILED
    );
  }

  return ResultDB(
    STATUS_CODES.OK,
    true,
    COLLECTION_MESSAGES.UPDATED,
    updatedCollection
  );
};

export const getCollectionOfAStore = async ({
  storeId,
  search,
  tag,
  page = 1,
  limit = 10,
}: {
  storeId: string;
  search?: string;
  tag?: string;
  page?: number;
  limit?: number;
}) => {
  const storeObjectId = new mongoose.Types.ObjectId(storeId);
  const store = await getStoreById(storeObjectId);
  if ("statusCode" in store) return store;

  const query: FilterQuery<IStoreCollection> = { store: store._id };

  if (search) {
    query.name = { $regex: escapeRegex(search), $options: "i" };
  }

  if (tag) {
    query.tags = tag;
  }

  const [collections, totalCount] = await Promise.all([
    StoreCollection.find(query)
      .populate({
        path: "store",
        select: "name owner",
        populate: {
          path: "owner",
          select: "username profilePicture displayName",
        },
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    StoreCollection.countDocuments(query),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  return ResultDB(STATUS_CODES.OK, true, COLLECTION_MESSAGES.FETCHED, {
    data: collections,
    pagination: {
      totalCount,
      totalPages,
      currentPage: page,
      limit,
    },
  });
};

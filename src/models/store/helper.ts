import { Types } from "mongoose";
import { ApiResponse, ResultDB } from "../../utils/responseHandler";
import { Store } from "./store.schema";
import { STATUS_CODES } from "../../constants/statusCodes";
import { STORE_MESSAGES } from "../../constants/responseMessage";
import UserModel from "../user/user.schema";
import { AWS_S3_BUCKET_NAME } from "../../config/environment";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import s3Client from "../../config/s3";
import { IStoreProduct } from "./store.types";

export const getCreatorStore = async (ownerId: Types.ObjectId) => {
  // Check if owner is deleted
  const owner = await UserModel.findOne({ _id: ownerId, isDeleted: false });
  if (!owner) {
    return ResultDB(
      STATUS_CODES.NOT_FOUND,
      false,
      "Store owner not found or account deleted",
      null
    );
  }

  const store = await Store.findOne({ owner: ownerId });
  if (!store) {
    return ResultDB(
      STATUS_CODES.NOT_FOUND,
      false,
      STORE_MESSAGES.STORE_NOT_FOUND,
      null
    );
  }

  if (!store.isActive) {
    return ResultDB(
      STATUS_CODES.FORBIDDEN,
      false,
      "Store is inactive",
      null
    );
  }

  return store;
};

export const getStoreById = async (storeId: Types.ObjectId) => {
  const store = await Store.findById(storeId);
  if (!store) {
    return ResultDB(
      STATUS_CODES.NOT_FOUND,
      false,
      STORE_MESSAGES.STORE_NOT_FOUND
    );
  }
  return store;
};

export const generateMerchandisePreSignedUrl = async (
  userId: string,
  contentType: string // e.g., "image/jpeg" or "video/mp4"
): Promise<any> => {
  const extensionMap: Record<string, string> = {
    "video/mp4": "mp4",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
  };

  const extension = extensionMap[contentType];
  if (!extension) {
    throw new Error(`Unsupported content type: ${contentType}`);
  }
  const key = `merchandise/${userId}/${Date.now()}.${extension}`;

  const command = new PutObjectCommand({
    Bucket: AWS_S3_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });
  let url = await getSignedUrl(s3Client, command, { expiresIn: 10 * 60 });

  return { url, key };
};

export function getStockForCart(product: IStoreProduct, variant?: any): number {
  if (product.variants && product.variants.length > 0 && variant) {
    return (
      product.variants.find(
        (v) =>
          v.sku === variant.sku &&
          (!variant.size || v.size === variant.size) &&
          (!variant.color || v.color === variant.color)
      )?.stock ?? 0
    );
  } else {
    return product.stock ?? 0;
  }
}

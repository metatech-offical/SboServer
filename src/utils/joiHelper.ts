import { Types } from "mongoose";

export const validateMongoObjectId = (value: string, helpers: any) => {
  if (!Types.ObjectId.isValid(value)) {
    return helpers.message("Invalid MongoDB ObjectId format.");
  }
  return value;
};

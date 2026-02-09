import { Types } from "mongoose";
export interface ICartVariant {
  size: string;
  color?: string;
  sku: string;
  price: number;
}

export interface ICartItem {
  productId: Types.ObjectId;
  storeId: Types.ObjectId;
  variant: ICartVariant;
  quantity: number;
  addedAt?: Date;
}

export interface ICart extends Document {
  userId: Types.ObjectId;
  items: ICartItem[];
  lastUpdated: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

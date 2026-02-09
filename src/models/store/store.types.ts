import { Types, Document } from "mongoose";

// Interface for Store document
export interface IStore extends Document {
  owner: Types.ObjectId;
  name: string;
  bio?: string;
  logo?: string;
  banner?: string;
  collectionsCount: number;
  totalProducts: number;
  liveProducts: number;
  outOfStockProducts: number;
  isActive: boolean;
  globalReturnPolicy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IStoreCollection extends Document {
  name: string;
  description?: string;
  tags: string[];
  coverImage?: string;
  store: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IVariant {
  size: string;
  stock: number;
  sku: string;
  price: number;
  color?: string;
}

export enum PRODUCT_STATUS {
  LIVE = "live",
  DRAFT = "draft",
  COMING_SOON = "coming_soon",
}

export interface IStoreProduct {
  productName: string;
  description?: string;
  price: number;
  media: string[];
  storeId: Types.ObjectId;
  collectionId: Types.ObjectId;
  sku?: string;
  tags?: string[];
  category: string;
  returnPolicy?: string;
  stock?: number;
  hasVariants: boolean;
  variants: IVariant[];
  status: "live" | "draft" | "coming_soon";
  createdAt: Date;
  updatedAt: Date;
}

export type IStoreProductDocument = Document<Types.ObjectId> & IStoreProduct;

export interface IPopulatedProduct extends IStoreProduct {
  store?: IStore; //for populated products
}

import { Types, Document } from "mongoose";
import { IUser } from "../user/user.type";

export interface IOrderItem {
  productId: Types.ObjectId;
  productName: string;
  sku: string;
  media: string[];
  variant?: {
    size?: string;
    color?: string;
    price: number;
  };
  quantity: number;
  itemPrice: number;
  lineTotal: number;
}

export interface IOrderAddress {
  fullName: string;
  mobileNumber: string;
  countryCode: string;
  streetNo?: string;
  location?: { lat: number; lng: number };
  buildingName: string;
  city: string;
  areaDistrict: string;
  landmark?: string;
  addressType: "home" | "office" | "other";
}

export interface IPaymentInfo {
  paymentId: string;
  provider: string;
  status: "pending" | "success" | "failed";
  paidAt?: Date;
}

export interface IOrder extends Document {
  userId: Types.ObjectId;
  storeId: Types.ObjectId;
  creatorId: Types.ObjectId;
  address: IOrderAddress;
  items: IOrderItem[];
  totalAmount: number;
  status: EOrderStatus;
  payment: IPaymentInfo;
  trackingLink?: string;
  reservedUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
  user?: IUser; //for populated orders
}

export enum EOrderStatus {
  PENDING = "pending", //order placed by user, not accepted by creator yet
  ACCEPTED = "accepted", //order accepted by creator
  REJECTED = "rejected", //order rejected by creator
  COMPLETED = "completed", //order delievered to user
  CANCELLED = "cancelled", //order cancelled by user
  RETURNED = "returned", //order returned by user
}

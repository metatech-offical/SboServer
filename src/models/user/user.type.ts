import { Document, Schema, Types } from "mongoose";
import { EUserProvider } from "../../types/enum";

export interface IAuthProvider {
  provider: EUserProvider;
  id?: string;
}

export interface Subscription {
  plan: Schema.Types.ObjectId;
  status: "active" | "expired";
}

export type NotificationSettings = {
  [key: string]: boolean;
};
export type ThemeSettings = "light" | "dark" | "system";

export enum MembershipLevel {
  STANDARD = "standard",
  CREATOR = "creator",
}

export enum UserStatus {
  ACTIVE = "Active",
  INACTIVE = "Inactive",
  SUSPENDED = "Suspended",
  BANNED = "Banned"
}

export type DeleteReason = {
  category: string;
  reason: string;
  deletedAt: Date;
};

export interface IUser extends Document {
  _id: Types.ObjectId;
  username: string;
  email: string;
  phoneNumber: string;
  displayName?: string;
  bio?: string;
  profilePicture?: string;
  password?: string;
  provider?: IAuthProvider;
  verified: boolean;
  verifyPassword: (password: string) => Promise<boolean>;
  isDeleted: boolean;
  status: UserStatus;
  deletedReason: DeleteReason[];
  membership: MembershipLevel;
  notificationSettings: NotificationSettings;
  platformSubscription: Subscription | null;
  creatorSubscriptions: Subscription[];
  lastLogin: Date;
  sharesCount: number;
}

export interface IUserBlock extends Document {
  blocker: Types.ObjectId;
  blocked: Types.ObjectId;
  blockedAt: Date;
}

export interface IUserFollow extends Document {
  followerId: Types.ObjectId; // person who follows
  followingId: Types.ObjectId; // person being followed
  createdAt: Date;
  follower?: IUser;
  following?: IUser;
}
export interface IWishlist extends Document {
  userId: Types.ObjectId;
  productId: Types.ObjectId;
}

export interface IOnboardingRedisUser {
  uuid: string;
  email?: string;
  phoneNumber?: string;
  onboardingSteps: {
    emailVerified: boolean;
    phoneVerified: boolean;
  };
  username?: string;
  password?: string;
}

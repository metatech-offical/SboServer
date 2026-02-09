import mongoose, { Schema, Document, Types } from "mongoose";
import { EContentVisibility } from "../../types/enum";

export interface IShorts extends Document {
  _id: Types.ObjectId;
  description: string;
  videoUrl?: string;
  thumbnailUrl: string;
  audioDetails?: {
    audioId?: string;
    title?: string;
    artist?: string;
    duration?: number;
  };
  duration: number;
  creatorId: Schema.Types.ObjectId;
  location?: {
    coordinates: {
      lat: string;
      lng: string;
    };
    address: string;
  };
  category: string;
  tags: string[];
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
  sharesCount: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  settings: { visibility: EContentVisibility };
}

export interface IPopulatedShort extends Omit<IShorts, keyof Document> {
  _id: string;
  isLiked: boolean;
  isViewed: boolean;
  isSaved: boolean;
  isFollowing: boolean;
  creator?: {
    _id: string;
    username: string;
    displayName: string;
    profilePicture: string;
  };
}

export interface IShortsQuery {
  creatorId?: mongoose.Types.ObjectId;
  category?: string;
  description?: {
    $regex: string | RegExp;
    $options?: string;
  };
}

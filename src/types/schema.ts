import { Document, Schema, Types } from "mongoose";

export enum EShareContentModel {
  STREAM = "STREAM",
  SHORT = "SHORT",
  STORY = "STORY",
}

export interface IPlaylistItem {
  itemId: Types.ObjectId;
  itemType: "stream" | "short";
}

export interface IPlaylist extends Document {
  title: string;
  description?: string;
  createdBy: Schema.Types.ObjectId;
  items: IPlaylistItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IPagination {
  limit: number;
  currentPage: number;
  totalRecords: number;
  totalPages: number;
}

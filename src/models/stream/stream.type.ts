import { Types, Document } from "mongoose";
import { EContentVisibility } from "../../types/enum";

export type StreamType = "vr" | "video" | "video-live";
export type StreamStatus =
  | "uploading"
  | "draft"
  | "published"
  | "ended"
  | "uploaded";

interface IModeration {
  reviewedBy: string;
  reviewTimestamp: Date;
  reason: string;
}

export interface IStream extends Document {
  description?: string;
  duration?: number;
  creatorId: Types.ObjectId;
  thumbnailUrl?: string;
  videoUrl?: string;
  transcodedUrl?: string;
  type: StreamType;
  status: StreamStatus;
  isLive: boolean;
  title: string;
  category?: string;
  tags?: string[];
  settings: {
    visibility: EContentVisibility;
  };
  isDeleted: boolean;
  createdAt: Date;
  endedAt?: Date;
  vodStatus: String;
  moderationDetails: IModeration;
  viewsCount: number;
  likesCount: number;
  sharesCount: number;
  commentsCount: number;
  roomId?: string;
  vodRecordingTaskId?: string;
  saveVod?: boolean;
  token?: string;
  vodMeta?: {
    fileUrl?: string;
    fileName?: string;
    duration?: number;
    size?: number;
    [key: string]: any;
  };
}

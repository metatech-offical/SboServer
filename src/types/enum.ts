export enum EUserProvider {
  email = "email",
  phone = "phoneNumber",
}

export enum EPlatformType {
  IOS = "ios",
  ANDROID = "android",
  WEB = "WEB",
}

export enum EReportReason {
  SPAM = "Spam or misleading",
  ADULT = "Sexual content",
  INAPPROPRIATE = "Inappropriate hateful or abusive content",
  HARMFUL = "Harmful or dangerous acts",
  VIOLENT = "Violent or repulsive content",
}

export enum EReportStatus {
  PENDING = "pending",
  REVIEWED = "reviewed",
  RESOLVED = "resolved",
  REJECTED = "rejected",
}

export enum EProfileQueryType {
  HOME = "home",
  VIDEOS = "videos",
  LIVE_VIDEO = "video-live",
  SHORTS = "shorts",
  POSTS = "posts",
  PLAYLISTS = "playlists",
}

export enum EContentVisibility {
  everyone = "everyone",
  subscribers = "subscribers"
}
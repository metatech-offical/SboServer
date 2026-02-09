export enum EContentType {
  SHORT = "shorts",
  STREAM = "streams",
  POST = "posts",
  COMMENT = "contentcomments",
  USER = "users",
}

export enum ENotificationContentCollection {
  orders = "orders",
  userSubscribed = "usercreatorsubscriptions",
}

export type ENotificationContentType =
  | EContentType
  | ENotificationContentCollection;

export const collectionNames = {
  CONTENT_LIKES: "contentlikes",
  CONTENT_VIEWS: "contentviews",
  SHARES: "shares",
  SAVED_ITEMS: "saveditems",
  NOT_INTERESTED: "notinteresteds",
  REPORT: "reports",
  USER_BLOCKS: "userblocks",
  USER_FOLLOWS: "userfollows",
  OTP: "otps",
  DEVICE: "devices",
  NOTIFICATIONS: "notifications",
  REPORT_PROBLEM: "reportproblems",
  PLAYLIST: "playlists",
  CATEGORY: "categories",
  KEYWORD: "keywords",
  STORE: "stores",
  CART: "carts",
  USER_ADDRESSES: "useraddresses",
  CREATOR_SUBSCRIPTION_PLANS: "creatorsubscriptionplans",
  TREDNING_SCORES: "trendingscores",
  CONTENT_COMMENTS: EContentType.COMMENT,
  SHORT: EContentType.SHORT,
  STREAM: EContentType.STREAM,
  POST: EContentType.POST,
  USER: EContentType.USER,
  ORDER: ENotificationContentCollection.orders,
  USER_CREATOR_SUBSCRIPTIONS: ENotificationContentCollection.userSubscribed,
  EVENT: "events",
  EVENT_TICKET: "eventtickets",
  EVENT_TICKET_ORDER: "eventticketorders",
};

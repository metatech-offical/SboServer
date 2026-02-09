export const NOTIFICATION_TTL = 60 * 60 * 24 * 30;

export const NOTIFICATION_TITLE = {
  NEW_CONTENT: `New Content`,
  LIKE: "New Like",
  COMMENT: "New Comment",
  NEW_FOLLOWER: "New Follower",
  ORDER_PLACED: "Order placed",
  ORDER_STATUS: "Order updated",
  USER_SUBSCRIBED: "User subscribed",
};

export const NOTIFICATION_BODY = {
  NEW_CONTENT: (contentType: string = "content", creatorName?: string) =>
    `${creatorName || ""} uploaded new ${contentType}`,
  LIKE: (contentType: string = "content", senderName?: string) =>
    `${senderName || ""} liked your ${contentType}`,
  COMMENT: (message: string, senderName?: string) =>
    `${senderName || ""} commented: ${message}`,
  NEW_FOLLOWER: (senderName?: string) =>
    `${senderName || ""} started following you`,
  ORDER_PLACED: (role: string, orderId: string) =>
    role === "user"
      ? `Order #${orderId.slice(0, 6)} placed, awaiting creator confirmation!`
      : `Order #${orderId.slice(0, 6)} placed, user awaiting confirmation!`,
  ORDER_STATUS: (status: string, orderId: string) =>
    `Order #${orderId.slice(0, 6)} ${status}`,
  USER_SUBSCRIBED: (senderName?: string) =>
    `${senderName || ""} subscribed you!`,
};

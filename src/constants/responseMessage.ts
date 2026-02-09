export const OTP_MESSAGES = Object.freeze({
  SUCCESS: "OTP sent successfully",
  INVALID_INPUT: "Invalid input provided.",
  NOT_FOUND: "The requested resource was not found.",
  INTERNAL_SERVER_ERROR:
    "An unexpected error occurred. Error verifying OTP. Please try again later.",
  UNAUTHORIZED: "You are not authorized to perform this action.",
  USER_VERIFIED: "User already verified",
  USER_NOT_FOUND: "User not found",
  FORBIDDEN: "Access to this resource is forbidden.",
  EXPIRED: "Invalid OTP: it has expired",
  INVALID: "Invalid OTP",
  VERIFIED: "OTP verified successfully",
  RESENT: "OTP resent successfully",
  RESEND_ERROR: "Error re-sending OTP",
} as const);
/**
 * Response messages
 */
export const MESSAGES = Object.freeze({
  SUCCESS: "Operation successful.",
  FETCHED: "Data fetched successfully!",
  DELETED: "Requested resource deleted successfully!",
  INVALID_INPUT: "Invalid input provided.",
  NOT_FOUND: "The requested resource was not found.",
  SEARCH_KEYWORD: "Keyword is required and must be a string.",
  INTERNAL_SERVER_ERROR:
    "An unexpected error occurred. Please try again later.",
  UNAUTHORIZED: "You are not authorized to perform this action.",
  FORBIDDEN: "Access to this resource is forbidden.",
} as const);

export type MessageKey = keyof typeof MESSAGES;

/**
 * Auth response messages
 */
export const AUTHENTICATION_MESSAGES = Object.freeze({
  CREATE_ACCOUNT:
    "Account created successfully. OTP sent on your registered email.",
  LOGIN_ACCOUNT: "Account logged in successfully.",
  SIGNUP_FAILED: "Account signing up failed",
  SIGNIN_FAILED: "Account signing in failed",
  EMAIL_REQUIRED: "Email is required!",
  USER_EXISTS: "Account already exists!!",
  WRONG_PASS: "Password is incorrect!",
  PROVIDER_TYPE: `Provider type can only be "facebook" | "google" | "email" `,
  LOGOUT_SUCCESS: "Successfully logout",
  UNAUTHORIZED: "You are not authorized to perform this action.",
  PROVIDER_RESTRICTION:
    "You have an existing registration method that prevents this sign-in",
  NOT_VERIFIED: "Account not verified",
} as const);

export type AuthKey = keyof typeof AUTHENTICATION_MESSAGES;

export const STORE_MESSAGES = Object.freeze({
  CREATED: "Store created successfully",
  ALREADY_EXISTS: "Store already exists for this user",
  NOT_FOUND: "Store not found",
  UPDATED: "Store updated successfully",
  DELETED: "Store deleted successfully",
  FETCHED: "Store fetched successfully",
  FETCHED_ALL: "Stores fetched successfully",
  STORE_NOT_FOUND: " Store not found for this user.",
  NOT_A_CREATOR: "Only creators can create a store.",
  INTERNAL_ERROR: "Something went wrong while creating the store.",
} as const);

export const COLLECTION_MESSAGES = Object.freeze({
  CREATED: "Collection created successfully.",
  ALREADY_EXISTS: "Collection name already exists in your store.",
  STORE_NOT_FOUND: "Store not found for this creator.",
  FETCHED: "Collections fetched successfully.",
  INTERNAL_ERROR: "Something went wrong while handling collection.",
  COLLECTION_NOT_FOUND:
    "Collection not found or does not belong to your store.",
  UPDATE_FAILED: "Failed to update collection. Please try again.",
  UPDATED: "Collection updated successfully.",
} as const);

export type CollectionMessage = keyof typeof COLLECTION_MESSAGES;

export const PRODUCT_MESSAGES = Object.freeze({
  CREATED: "Product created successfully.",
  STORE_NOT_FOUND: "Store not found for this user.",
  COLLECTION_NOT_FOUND: "Collection not found or does not belong to store.",
  FETCHED: " Products fetched successfully.",
  WISHLISTED: "Product added to wishlist successfully.",
  UNWISHLISTED: "Product removed from wishlist successfully.",
  INTERNAL_ERROR:
    "An error occurred while creating the product. Please try again.",
  NOT_FOUND: "Product not found.",
  PRODUCT_NOT_FOUND: "Product not found or does not belong to your store.",
  UPDATE_FAILED: "Failed to update product. Please try again.",
  UPDATED: "Product updated successfully.",
  INVALID_STORE_ITEM: "All products must be from the same store.",
  VARIANT_REQUIRED: "Variant information is required for this product.",
  VARIANT_NOT_FOUND: "Variant not found for this product.",
  INSUFFICIENT_STOCK: "Insufficient stock for this product or variant.",
} as const);

export const SHORT_MESSAGES = Object.freeze({
  CREATED: "Short created successfully.",
  DELETED: "Short deleted successfully.",
  DELETE_FAILED: "Failed to delete short!",
  CREATION_FAILED: "Failed to create Short!",
  RECOMMENDED_FETCHED: "Recommended shorts fetched successfully.",
} as const);

export const POST_ACTION_MESSAGES = Object.freeze({
  CREATED: (postType: string) => `${postType} created successfully.`,
  CREATION_FAILED: (postType: string) => `Failed to create ${postType}!`,
  LIKE: (postType: string) => `${postType} liked successfully.`,
  UNLIKE: (postType: string) => `${postType} unliked successfully.`,
  SAVE: (postType: string) => `${postType} saved successfully.`,
  UNSAVE: (postType: string) => `${postType} unsaved successfully.`,
  COMMENT: (postType: string) => `Comment successfully added to ${postType}`,
  COMMENT_DELETE: (postType: string) =>
    `${postType} comment deleted successfully`,
  COMMENT_DELETE_FAIL: "Failed to delete comment!",
  NOT_FOUND: (postType: string) => `${postType} not found.`,
  ERROR_LIKE_ACTION: "Failed to perform like/unlike operation",
  ERROR_SAVE_ACTION: "Failed to perform save/unsave operation",
  ERROR_VIEW_ACTION: "Failed to perform view operation",
  ERROR_COMMENT_ACTION: "Failed to perform comment operation",
  INVALID_ACTION: "Invalid action",
} as const);

export const VIEW_TRACKING_MESSAGES = Object.freeze({
  TRACKED_SUCCESS: "View tracked successfully",
  ALREADY_TRACKED: "View already tracked",
  TRACKING_FAILED: "Failed to track view",
  FAVORITE_CREATORS_FETCHED: "Favorite creators retrieved successfully",
  NO_FAVORITE_CREATORS: "No favorite creators found",
} as const);

export const PLAYLIST_MESSAGES = Object.freeze({
  CREATED: "Playlist created successfully.",
  DELETED: "Playlist deleted successfully.",
  UPDATED: "Playlist updated successfully.",
  DELETE_FAILED: "Failed to delete playlist!",
  NOT_FOUND: "Playlist not found.",
  ITEM_EXISTS: "Item already exists in playlist.",
  ITEM_ADDED: "Item added to playlist.",
  ITEM_REMOVED: "Item removed from playlist.",
  ITEM_NOT_FOUND: "Item not found in playlist.",
  FETCHED: " Playlist fetched successfully.",
  ERROR_FETCHING: "Error fetching playlist.",
} as const);

export const POST_MESSAGES = Object.freeze({
  CREATED: "Post created successfully",
  FAILED: "Failed to create post",
  DELETED: "Post deleted successfully",
  DELETE_FAILED: "Failed to delete post",
  NOT_FOUND: "Post not found",
  UNAUTHORIZED: "You can only delete your own posts",
  FETCHED: "Posts fetched successfully",
  FETCHED_BY_USER: "User posts fetched successfully",
  NO_POSTS: "No posts found for this user",
});

export const USER_ADDRESS_MESSAGES = Object.freeze({
  CREATED: "Address created successfully",
  UPDATED: "Address updated successfully",
  DELETED: "Address deleted successfully",
  FETCHED: "Addresses fetched successfully",
  FETCH_ONE: "Address fetched successfully",
  NOT_FOUND: "Address not found",
  INTERNAL_ERROR: "Something went wrong",
});

export const ORDER_MESSAGES = Object.freeze({
  ADDRESS_NOT_FOUND: "Address not found.",
  CART_EMPTY: "Cart is empty.",
  READY_FOR_ORDER_CREATION: "Order validated, ready for creation.",
  ORDER_CREATED: "Order placed successfully.",
  ORDER_NOT_FOUND: "Order not found.",
  PAYMENT_FAILED: "Payment failed.",
  PAYMENT_SUCCESS: "Payment successful.",
  ORDER_ALREADY_PAID: "Order is already paid.",
  INVALID_ORDER_STATUS: "Invalid order status.",
  INTERNAL_ERROR: "An internal error occurred while processing the order.",
});

export const CREATOR_SUBSCRIPTION_MESSAGES = Object.freeze({
  PLAN_CREATED: "Subscription plan created successfully",
  PLAN_LIMIT_REACHED: "You can only create up to 5 subscription plans",
  PLANS_FETCHED: "Creator subscription plans fetched successfully",
  PLAN_NOT_FOUND: "Subscription plan not found",
  ALREADY_SUBSCRIBED: "You are already subscribed to this creator",
  SUBSCRIBED: "Subscription successful",
  NOT_SUBSCRIBED: "No active subscription found",
  UNSUBSCRIBED: "Unsubscribed successfully",
  INTERNAL_ERROR: "Something went wrong",
  UPDATED: "Subscription plan updated successfully",
  DELETED: "Subscription plan deleted successfully",
  UPDATE_UNAUTHORIZED: "You can only update your own subscription plans",
  DELETE_UNAUTHORIZED: "You can only delete your own subscription plans",
  SUBSCRIBED_CREATORS_FETCHED: "Subscribed creators fetched successfully",
  SUBSCRIBERS_FETCHED: "Subscribers list fetched successfully",
});

export const STREAM_MESSAGES = Object.freeze({
  SUCCESS: "Stream added successfully.",
  FETCH_STREAMS: "Stream list fetched successfully",
  INVALID_INPUT: "Invalid streamId provided.",
  NOT_FOUND: "The requested stream was not found.",
  CHANNEL_STOPPED: "Channel stopped successfully",
  USER_NOT_FOUND: "User not found",
  TOTAL_LIKES_FETCHED: "Total likes fetched successfully",
  ERROR_TOTAL_LIKES: "Error fetching total likes",
  DELETED: "Stream deleted successfully",

  INTERNAL_SERVER_ERROR:
    "An unexpected error occurred. Please try again later.",
  UNAUTHORIZED: "You are not authorized to perform this action.",
  FORBIDDEN: "Access to this resource is forbidden.",

  LIVE_STARTED: "Live stream started successfully.",
} as const);

export type StreamMessage = keyof typeof STREAM_MESSAGES;

export const EVENT_MESSAGES = Object.freeze({
  CREATED: "Event created successfully",
  UPDATED: "Event updated successfully",
  POSTPONED: "Event postponed successfully",
  CANCELLED: "Event cancelled successfully",
  DELETED: "Event deleted successfully",
  FETCHED: "Event fetched successfully",
  FETCHED_ALL: "Events fetched successfully",
  NOT_FOUND: "Event not found",
  INVALID_CREATOR: "Event does not belong to this creator",
  TICKET_LIMIT_REQUIRED: "At least one ticket type is required",
  TICKET_CREATED: "Event tickets created successfully",
  TICKET_UPDATED: "Event ticket updated successfully",
  TICKET_NOT_FOUND: "Event ticket not found",
  TICKET_SOLD_OUT: "Ticket is sold out",
  EVENT_PAST: "Cannot update a past event",
  INTERNAL_ERROR: "Something went wrong while processing the event",
} as const);

export const TICKET_ORDER_MESSAGES = Object.freeze({
  ORDER_CREATED: "Ticket order created successfully",
  ORDER_CONFIRMED: "Ticket order confirmed successfully",
  ORDER_CANCELLED: "Ticket order cancelled successfully",
  ORDER_REFUNDED: "Ticket order refunded successfully",
  ORDER_FETCHED: "Order fetched successfully",
  ORDERS_FETCHED: "Orders fetched successfully",
  ORDER_NOT_FOUND: "Order not found",
  INVALID_ORDER: "Invalid order",
  INSUFFICIENT_TICKETS: "Insufficient tickets available",
  TICKET_LIMIT_EXCEEDED: "Ticket limit per user exceeded",
  EVENT_NOT_AVAILABLE: "Event is not available for booking",
  EVENT_CANCELLED: "Event has been cancelled",
  EVENT_PAST: "Cannot book tickets for a past event",
  INVALID_TICKET: "Invalid ticket selection",
  INVALID_QUANTITY: "Invalid ticket quantity",
  PAYMENT_REQUIRED: "Payment is required to confirm order",
  PAYMENT_FAILED: "Payment processing failed",
  CANNOT_CANCEL: "Order cannot be cancelled",
  ALREADY_CANCELLED: "Order is already cancelled",
  ALREADY_REFUNDED: "Order is already refunded",
  INTERNAL_ERROR: "Something went wrong while processing the order",
} as const);

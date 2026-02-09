import { Router } from "express";
import { validator } from "../middlewares/validator";
import {
  adminLoginSchema,
  createAdminSchema,
  updateAdminProfileSchema,
  updateAdminStatusSchema,
  updateAdminRoleSchema,
  userIdParamSchema,
  updateUserStatusSchema,
  suspendUserSchema,
  banUserSchema,
  creatorIdParamSchema,
  disableCreatorSchema,
  removeContentSchema,
  videoIdParamSchema,
  shortIdParamSchema,
  postIdParamSchema,
  deleteContentSchema,
  eventIdParamSchema,
  ticketIdParamSchema,
  orderIdParamSchema,
  updateEventStatusSchema,
  pauseTicketSchema,
  deleteEventSchema,
  updateOrderStatusSchema,
  productIdParamSchema,
  storeIdParamSchema,
  updateProductStatusSchema,
} from "../validators/admin.validator";
import {
  httpAdminLogin,
  httpGetAdminProfile,
  httpCreateAdmin,
  httpUpdateAdminProfile,
  httpUpdateAdminStatus,
  httpUpdateAdminRole,
  httpGetAllAdmins,
  httpDeleteAdmin,
} from "../controllers/adminControllers/adminAuth.controller";
import {
  httpGetDashboardStats,
  httpGetRecentTransactions,
  httpGetEventStats as httpGetDashboardEventStats,
  httpGetAllEvents as httpGetDashboardEvents,
  httpGetTicketStats,
  httpGetAllTickets,
} from "../controllers/adminControllers/adminDashboard.controller";
import {
  httpGetAllUsers,
  httpGetUserById,
  httpUpdateUserStatus,
  httpSuspendUser,
  httpBanUser,
  httpReactivateUser,
  httpGetUserStats,
} from "../controllers/adminControllers/adminUserManagement.controller";
import {
  httpGetAllCreators,
  httpGetCreatorById,
  httpApproveCreator,
  httpDisableCreator,
  httpRemoveCreatorContent,
  httpGetCreatorStats,
  httpGetCreatorContent,
} from "../controllers/adminControllers/adminCreatorManagement.controller";
import {
  httpGetContentStats,
  httpGetAllVideos,
  httpGetAllShorts,
  httpGetAllPosts,
  httpGetVideoById,
  httpGetShortById,
  httpGetPostById,
  httpDeleteVideo,
  httpDeleteShort,
  httpDeletePost,
  httpRestoreVideo,
  httpRestoreShort,
  httpRestorePost,
} from "../controllers/adminControllers/adminContentModeration.controller";
import {
  httpGetBasicReports,
  httpSearchOrders,
  httpSearchTicketOrders,
  httpGetOrderById,
  httpGetTicketOrderById,
  httpResendOrderEmail,
  httpResendTicketEmail,
} from "../controllers/adminControllers/adminReports.controller";
import {
  httpGetUserAnalytics,
  httpGetContentAnalytics,
  httpGetRevenueAnalytics,
  httpGetEventAnalytics,
  httpGetSubscriptionAnalytics,
  httpGetOverviewAnalytics,
} from "../controllers/adminControllers/adminAnalytics.controller";
import {
  httpGetEventStats,
  httpGetAllEvents,
  httpGetEventById,
  httpUpdateEventStatus,
  httpPauseTicketSales,
  httpPauseTicketType,
  httpDeleteEvent,
  httpGetAllOrders,
  httpGetOrderById as httpGetEventOrderById,
  httpUpdateOrderStatus,
  httpGetEventsByCreator,
  httpGetEventCategories,
} from "../controllers/adminControllers/adminEventManagement.controller";
import {
  httpGetMerchandiseStats,
  httpGetAllProducts,
  httpGetProductById,
  httpUpdateProductStatus,
  httpGetAllStores,
  httpGetStoreById,
  httpToggleStoreStatus,
  httpGetProductCategories,
  httpGetProductsByCreator,
} from "../controllers/adminControllers/adminMerchandise.controller";
import { authenticateAdmin, isSuperAdmin, isAdmin } from "../middlewares/authenticateAdmin";

const adminRouter = Router();

// ============ Authentication Routes ============
adminRouter.post("/auth/login", validator.body(adminLoginSchema), httpAdminLogin);

// Protected routes - require admin authentication
adminRouter.get("/auth/me", authenticateAdmin, httpGetAdminProfile);
adminRouter.put(
  "/auth/profile",
  authenticateAdmin,
  validator.body(updateAdminProfileSchema),
  httpUpdateAdminProfile
);

// Admin management (super admin and admin only)
adminRouter.post(
  "/auth/create",
  authenticateAdmin,
  isAdmin,
  validator.body(createAdminSchema),
  httpCreateAdmin
);

adminRouter.get("/auth/admins", authenticateAdmin, isSuperAdmin, httpGetAllAdmins);

adminRouter.put(
  "/auth/:adminId/status",
  authenticateAdmin,
  isSuperAdmin,
  validator.body(updateAdminStatusSchema),
  httpUpdateAdminStatus
);

adminRouter.put(
  "/auth/:adminId/role",
  authenticateAdmin,
  isSuperAdmin,
  validator.body(updateAdminRoleSchema),
  httpUpdateAdminRole
);

adminRouter.delete("/auth/:adminId", authenticateAdmin, isSuperAdmin, httpDeleteAdmin);

// ============ Dashboard Routes ============
adminRouter.get("/dashboard/stats", authenticateAdmin, httpGetDashboardStats);
adminRouter.get("/dashboard/transactions", authenticateAdmin, httpGetRecentTransactions);

// ============ User Management Routes ============
adminRouter.get("/users/stats", authenticateAdmin, httpGetUserStats);
adminRouter.get("/users", authenticateAdmin, httpGetAllUsers);
adminRouter.get(
  "/users/:userId",
  authenticateAdmin,
  validator.params(userIdParamSchema),
  httpGetUserById
);
adminRouter.put(
  "/users/:userId/status",
  authenticateAdmin,
  isAdmin,
  validator.params(userIdParamSchema),
  validator.body(updateUserStatusSchema),
  httpUpdateUserStatus
);
adminRouter.post(
  "/users/:userId/suspend",
  authenticateAdmin,
  isAdmin,
  validator.params(userIdParamSchema),
  validator.body(suspendUserSchema),
  httpSuspendUser
);
adminRouter.post(
  "/users/:userId/ban",
  authenticateAdmin,
  isSuperAdmin,
  validator.params(userIdParamSchema),
  validator.body(banUserSchema),
  httpBanUser
);
adminRouter.post(
  "/users/:userId/reactivate",
  authenticateAdmin,
  isAdmin,
  validator.params(userIdParamSchema),
  httpReactivateUser
);

// ============ Creator Management Routes ============
adminRouter.get("/creators/stats", authenticateAdmin, httpGetCreatorStats);
adminRouter.get("/creators", authenticateAdmin, httpGetAllCreators);
adminRouter.get(
  "/creators/:creatorId",
  authenticateAdmin,
  validator.params(creatorIdParamSchema),
  httpGetCreatorById
);
adminRouter.get(
  "/creators/:creatorId/content",
  authenticateAdmin,
  validator.params(creatorIdParamSchema),
  httpGetCreatorContent
);
adminRouter.post(
  "/creators/:creatorId/approve",
  authenticateAdmin,
  isAdmin,
  validator.params(creatorIdParamSchema),
  httpApproveCreator
);
adminRouter.post(
  "/creators/:creatorId/disable",
  authenticateAdmin,
  isAdmin,
  validator.params(creatorIdParamSchema),
  validator.body(disableCreatorSchema),
  httpDisableCreator
);
adminRouter.delete(
  "/creators/:creatorId/content",
  authenticateAdmin,
  isAdmin,
  validator.params(creatorIdParamSchema),
  validator.body(removeContentSchema),
  httpRemoveCreatorContent
);

// ============ Event Management Routes ============
// Stats
adminRouter.get("/events/stats", authenticateAdmin, httpGetEventStats);
adminRouter.get("/events/categories", authenticateAdmin, httpGetEventCategories);

// Events CRUD
adminRouter.get("/events", authenticateAdmin, httpGetAllEvents);

// Specific routes must come before parameterized routes to avoid conflicts
// Events by creator
adminRouter.get(
  "/events/creator/:creatorId",
  authenticateAdmin,
  validator.params(creatorIdParamSchema),
  httpGetEventsByCreator
);

// Ticket Orders Management Routes (must come before /events/:eventId)
adminRouter.get("/events/orders", authenticateAdmin, httpGetAllOrders);
adminRouter.get(
  "/events/orders/:orderId",
  authenticateAdmin,
  validator.params(orderIdParamSchema),
  httpGetEventOrderById
);
adminRouter.put(
  "/events/orders/:orderId/status",
  authenticateAdmin,
  isAdmin,
  validator.params(orderIdParamSchema),
  validator.body(updateOrderStatusSchema),
  httpUpdateOrderStatus
);

// Ticket sales management (must come before /events/:eventId)
adminRouter.put(
  "/events/tickets/:ticketId/pause",
  authenticateAdmin,
  isAdmin,
  validator.params(ticketIdParamSchema),
  validator.body(pauseTicketSchema),
  httpPauseTicketType
);

// Parameterized routes come last
adminRouter.get(
  "/events/:eventId",
  authenticateAdmin,
  validator.params(eventIdParamSchema),
  httpGetEventById
);
adminRouter.put(
  "/events/:eventId/status",
  authenticateAdmin,
  isAdmin,
  validator.params(eventIdParamSchema),
  validator.body(updateEventStatusSchema),
  httpUpdateEventStatus
);
adminRouter.delete(
  "/events/:eventId",
  authenticateAdmin,
  isAdmin,
  validator.params(eventIdParamSchema),
  validator.body(deleteEventSchema),
  httpDeleteEvent
);
adminRouter.put(
  "/events/:eventId/tickets/pause",
  authenticateAdmin,
  isAdmin,
  validator.params(eventIdParamSchema),
  validator.body(pauseTicketSchema),
  httpPauseTicketSales
);

// Legacy dashboard routes (keep for backwards compatibility)
adminRouter.get("/dashboard/events/stats", authenticateAdmin, httpGetDashboardEventStats);
adminRouter.get("/dashboard/events", authenticateAdmin, httpGetDashboardEvents);
adminRouter.get("/dashboard/tickets/stats", authenticateAdmin, httpGetTicketStats);
adminRouter.get("/dashboard/tickets", authenticateAdmin, httpGetAllTickets);

// ============ Content Moderation Routes ============
// Stats
adminRouter.get("/content/stats", authenticateAdmin, httpGetContentStats);

// Videos
adminRouter.get("/content/videos", authenticateAdmin, httpGetAllVideos);
adminRouter.get(
  "/content/videos/:videoId",
  authenticateAdmin,
  validator.params(videoIdParamSchema),
  httpGetVideoById
);
adminRouter.delete(
  "/content/videos/:videoId",
  authenticateAdmin,
  isAdmin,
  validator.params(videoIdParamSchema),
  validator.body(deleteContentSchema),
  httpDeleteVideo
);
adminRouter.post(
  "/content/videos/:videoId/restore",
  authenticateAdmin,
  isAdmin,
  validator.params(videoIdParamSchema),
  httpRestoreVideo
);

// Shorts
adminRouter.get("/content/shorts", authenticateAdmin, httpGetAllShorts);
adminRouter.get(
  "/content/shorts/:shortId",
  authenticateAdmin,
  validator.params(shortIdParamSchema),
  httpGetShortById
);
adminRouter.delete(
  "/content/shorts/:shortId",
  authenticateAdmin,
  isAdmin,
  validator.params(shortIdParamSchema),
  validator.body(deleteContentSchema),
  httpDeleteShort
);
adminRouter.post(
  "/content/shorts/:shortId/restore",
  authenticateAdmin,
  isAdmin,
  validator.params(shortIdParamSchema),
  httpRestoreShort
);

// Posts
adminRouter.get("/content/posts", authenticateAdmin, httpGetAllPosts);
adminRouter.get(
  "/content/posts/:postId",
  authenticateAdmin,
  validator.params(postIdParamSchema),
  httpGetPostById
);
adminRouter.delete(
  "/content/posts/:postId",
  authenticateAdmin,
  isAdmin,
  validator.params(postIdParamSchema),
  validator.body(deleteContentSchema),
  httpDeletePost
);
adminRouter.post(
  "/content/posts/:postId/restore",
  authenticateAdmin,
  isAdmin,
  validator.params(postIdParamSchema),
  httpRestorePost
);

// ============ Reports Routes ============
// Basic reports
adminRouter.get("/reports/basic", authenticateAdmin, httpGetBasicReports);

// Orders search and management
adminRouter.get("/reports/orders/search", authenticateAdmin, httpSearchOrders);
adminRouter.get("/reports/orders/:orderId", authenticateAdmin, httpGetOrderById);
adminRouter.post("/reports/orders/:orderId/resend-email", authenticateAdmin, isAdmin, httpResendOrderEmail);

// Ticket orders search and management
adminRouter.get("/reports/tickets/search", authenticateAdmin, httpSearchTicketOrders);
adminRouter.get("/reports/tickets/:ticketOrderId", authenticateAdmin, httpGetTicketOrderById);
adminRouter.post("/reports/tickets/:ticketOrderId/resend-email", authenticateAdmin, isAdmin, httpResendTicketEmail);

// ============ Analytics Routes ============
adminRouter.get("/analytics/overview", authenticateAdmin, httpGetOverviewAnalytics);
adminRouter.get("/analytics/users", authenticateAdmin, httpGetUserAnalytics);
adminRouter.get("/analytics/content", authenticateAdmin, httpGetContentAnalytics);
adminRouter.get("/analytics/revenue", authenticateAdmin, httpGetRevenueAnalytics);
adminRouter.get("/analytics/events", authenticateAdmin, httpGetEventAnalytics);
adminRouter.get("/analytics/subscriptions", authenticateAdmin, httpGetSubscriptionAnalytics);

// ============ Merchandise Management Routes ============
// Stats
adminRouter.get("/merchandise/stats", authenticateAdmin, httpGetMerchandiseStats);
adminRouter.get("/merchandise/categories", authenticateAdmin, httpGetProductCategories);

// Products
adminRouter.get("/merchandise/products", authenticateAdmin, httpGetAllProducts);
adminRouter.get(
  "/merchandise/products/:productId",
  authenticateAdmin,
  validator.params(productIdParamSchema),
  httpGetProductById
);
adminRouter.put(
  "/merchandise/products/:productId/status",
  authenticateAdmin,
  isAdmin,
  validator.params(productIdParamSchema),
  validator.body(updateProductStatusSchema),
  httpUpdateProductStatus
);

// Stores
adminRouter.get("/merchandise/stores", authenticateAdmin, httpGetAllStores);
adminRouter.get(
  "/merchandise/stores/:storeId",
  authenticateAdmin,
  validator.params(storeIdParamSchema),
  httpGetStoreById
);
adminRouter.put(
  "/merchandise/stores/:storeId/toggle",
  authenticateAdmin,
  isAdmin,
  validator.params(storeIdParamSchema),
  httpToggleStoreStatus
);

// Products by creator
adminRouter.get(
  "/merchandise/creator/:creatorId/products",
  authenticateAdmin,
  validator.params(creatorIdParamSchema),
  httpGetProductsByCreator
);

export default adminRouter;

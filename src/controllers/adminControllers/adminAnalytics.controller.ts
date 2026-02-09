import type { Request, Response } from "express";
import { STATUS_CODES } from "../../constants/statusCodes";
import {
  ErrorResponse,
  SuccessResponse,
  printError,
} from "../../utils/responseHandler";
import UserModel from "../../models/user/user.schema";
import { MembershipLevel } from "../../models/user/user.type";
import { Event } from "../../models/event/event.schema";
import { StoreProduct } from "../../models/store/storeProducts.schema";
import StreamModel from "../../models/stream/stream.schema";
import ShortsModel from "../../models/short/short.schema";
import PostModel from "../../models/post/post.schema";
import OrderModel from "../../models/orders/order.schema";
import { EventTicketOrder } from "../../models/event/eventTicketOrder.schema";
import { UserCreatorSubscriptionModel } from "../../models/subscription/userCreatorSubscriptions.schema";

/**
 * Get user growth analytics (for charts)
 * GET /api/v1/admin/analytics/users
 */
export const httpGetUserAnalytics = async (req: Request, res: Response) => {
  try {
    const { period = "30" } = req.query; // days
    const days = parseInt(period as string) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // User growth over time
    const userGrowth = await UserModel.aggregate([
      { $match: { createdAt: { $gte: startDate }, isDeleted: false } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          total: { $sum: 1 },
          creators: {
            $sum: { $cond: [{ $eq: ["$membership", MembershipLevel.CREATOR] }, 1, 0] }
          },
          regularUsers: {
            $sum: { $cond: [{ $ne: ["$membership", MembershipLevel.CREATOR] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          date: "$_id",
          total: 1,
          creators: 1,
          regularUsers: 1,
          _id: 0
        }
      }
    ]);

    // User by membership breakdown
    const membershipBreakdown = await UserModel.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: "$membership",
          count: { $sum: 1 }
        }
      }
    ]);

    // Active users (logged in within last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const activeUsersCount = await UserModel.countDocuments({
      lastLogin: { $gte: thirtyDaysAgo },
      isDeleted: false
    });

    const totalUsers = await UserModel.countDocuments({ isDeleted: false });

    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      "User analytics retrieved successfully",
      {
        userGrowth,
        membershipBreakdown: membershipBreakdown.map(m => ({
          membership: m._id || "user",
          count: m.count
        })),
        activeUsers: activeUsersCount,
        totalUsers,
        engagementRate: totalUsers > 0 ? ((activeUsersCount / totalUsers) * 100).toFixed(1) : 0,
      }
    );
  } catch (error) {
    printError(error, "httpGetUserAnalytics");
    return ErrorResponse(res);
  }
};

/**
 * Get content analytics (videos, shorts, posts)
 * GET /api/v1/admin/analytics/content
 */
export const httpGetContentAnalytics = async (req: Request, res: Response) => {
  try {
    const { period = "30" } = req.query;
    const days = parseInt(period as string) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Content creation over time
    const [videoGrowth, shortsGrowth, postsGrowth] = await Promise.all([
      StreamModel.aggregate([
        { $match: { createdAt: { $gte: startDate }, isDeleted: false, type: { $in: ["video", "video-live"] } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } },
        { $project: { date: "$_id", videos: "$count", _id: 0 } }
      ]),
      ShortsModel.aggregate([
        { $match: { createdAt: { $gte: startDate }, deletedAt: null } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } },
        { $project: { date: "$_id", shorts: "$count", _id: 0 } }
      ]),
      PostModel.aggregate([
        { $match: { createdAt: { $gte: startDate }, isDeleted: false } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } },
        { $project: { date: "$_id", posts: "$count", _id: 0 } }
      ]),
    ]);

    // Merge content growth data by date
    const contentGrowthMap = new Map();
    
    videoGrowth.forEach((v: any) => {
      contentGrowthMap.set(v.date, { date: v.date, videos: v.videos, shorts: 0, posts: 0 });
    });
    
    shortsGrowth.forEach((s: any) => {
      if (contentGrowthMap.has(s.date)) {
        contentGrowthMap.get(s.date).shorts = s.shorts;
      } else {
        contentGrowthMap.set(s.date, { date: s.date, videos: 0, shorts: s.shorts, posts: 0 });
      }
    });
    
    postsGrowth.forEach((p: any) => {
      if (contentGrowthMap.has(p.date)) {
        contentGrowthMap.get(p.date).posts = p.posts;
      } else {
        contentGrowthMap.set(p.date, { date: p.date, videos: 0, shorts: 0, posts: p.posts });
      }
    });

    const contentGrowth = Array.from(contentGrowthMap.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Content type breakdown
    const [totalVideos, totalShorts, totalPosts] = await Promise.all([
      StreamModel.countDocuments({ isDeleted: false, type: { $in: ["video", "video-live"] } }),
      ShortsModel.countDocuments({ deletedAt: null }),
      PostModel.countDocuments({ isDeleted: false }),
    ]);

    // Total engagement metrics
    const [videoEngagement, shortsEngagement, postsEngagement] = await Promise.all([
      StreamModel.aggregate([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: null,
            totalViews: { $sum: "$viewsCount" },
            totalLikes: { $sum: "$likesCount" },
            totalComments: { $sum: "$commentsCount" },
            totalShares: { $sum: "$sharesCount" },
          }
        }
      ]),
      ShortsModel.aggregate([
        { $match: { deletedAt: null } },
        {
          $group: {
            _id: null,
            totalViews: { $sum: "$viewsCount" },
            totalLikes: { $sum: "$likesCount" },
            totalComments: { $sum: "$commentsCount" },
            totalShares: { $sum: "$sharesCount" },
          }
        }
      ]),
      PostModel.aggregate([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: null,
            totalLikes: { $sum: "$likesCount" },
            totalComments: { $sum: "$commentsCount" },
            totalShares: { $sum: "$sharesCount" },
          }
        }
      ]),
    ]);

    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      "Content analytics retrieved successfully",
      {
        contentGrowth,
        contentBreakdown: [
          { type: "Videos", count: totalVideos },
          { type: "Shorts", count: totalShorts },
          { type: "Posts", count: totalPosts },
        ],
        totalContent: totalVideos + totalShorts + totalPosts,
        engagement: {
          videos: videoEngagement[0] || { totalViews: 0, totalLikes: 0, totalComments: 0, totalShares: 0 },
          shorts: shortsEngagement[0] || { totalViews: 0, totalLikes: 0, totalComments: 0, totalShares: 0 },
          posts: postsEngagement[0] || { totalLikes: 0, totalComments: 0, totalShares: 0 },
        },
      }
    );
  } catch (error) {
    printError(error, "httpGetContentAnalytics");
    return ErrorResponse(res);
  }
};

/**
 * Get revenue analytics
 * GET /api/v1/admin/analytics/revenue
 */
export const httpGetRevenueAnalytics = async (req: Request, res: Response) => {
  try {
    const { period = "30" } = req.query;
    const days = parseInt(period as string) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Product orders revenue over time
    const productRevenue = await OrderModel.aggregate([
      { 
        $match: { 
          createdAt: { $gte: startDate },
          "payment.status": "success"
        } 
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$totalAmount" },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { date: "$_id", productRevenue: "$revenue", productOrders: "$orders", _id: 0 } }
    ]);

    // Ticket orders revenue over time
    const ticketRevenue = await EventTicketOrder.aggregate([
      { 
        $match: { 
          createdAt: { $gte: startDate },
          paymentStatus: "completed"
        } 
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$totalAmount" },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { date: "$_id", ticketRevenue: "$revenue", ticketOrders: "$orders", _id: 0 } }
    ]);

    // Merge revenue data
    const revenueMap = new Map();
    
    productRevenue.forEach((p: any) => {
      revenueMap.set(p.date, { 
        date: p.date, 
        productRevenue: p.productRevenue, 
        productOrders: p.productOrders,
        ticketRevenue: 0,
        ticketOrders: 0
      });
    });
    
    ticketRevenue.forEach((t: any) => {
      if (revenueMap.has(t.date)) {
        revenueMap.get(t.date).ticketRevenue = t.ticketRevenue;
        revenueMap.get(t.date).ticketOrders = t.ticketOrders;
      } else {
        revenueMap.set(t.date, { 
          date: t.date, 
          productRevenue: 0, 
          productOrders: 0,
          ticketRevenue: t.ticketRevenue,
          ticketOrders: t.ticketOrders
        });
      }
    });

    const revenueGrowth = Array.from(revenueMap.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(r => ({
        ...r,
        totalRevenue: r.productRevenue + r.ticketRevenue
      }));

    // Total revenue stats
    const [totalProductRevenue, totalTicketRevenue] = await Promise.all([
      OrderModel.aggregate([
        { $match: { "payment.status": "success" } },
        { $group: { _id: null, total: { $sum: "$totalAmount" }, count: { $sum: 1 } } }
      ]),
      EventTicketOrder.aggregate([
        { $match: { paymentStatus: "completed" } },
        { $group: { _id: null, total: { $sum: "$totalAmount" }, count: { $sum: 1 } } }
      ]),
    ]);

    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      "Revenue analytics retrieved successfully",
      {
        revenueGrowth,
        totalProductRevenue: totalProductRevenue[0]?.total || 0,
        totalProductOrders: totalProductRevenue[0]?.count || 0,
        totalTicketRevenue: totalTicketRevenue[0]?.total || 0,
        totalTicketOrders: totalTicketRevenue[0]?.count || 0,
        totalRevenue: (totalProductRevenue[0]?.total || 0) + (totalTicketRevenue[0]?.total || 0),
        revenueBreakdown: [
          { source: "Products", amount: totalProductRevenue[0]?.total || 0 },
          { source: "Tickets", amount: totalTicketRevenue[0]?.total || 0 },
        ],
      }
    );
  } catch (error) {
    printError(error, "httpGetRevenueAnalytics");
    return ErrorResponse(res);
  }
};

/**
 * Get event analytics
 * GET /api/v1/admin/analytics/events
 */
export const httpGetEventAnalytics = async (req: Request, res: Response) => {
  try {
    const { period = "30" } = req.query;
    const days = parseInt(period as string) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Events created over time
    const eventGrowth = await Event.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { date: "$_id", events: "$count", _id: 0 } }
    ]);

    // Event status breakdown
    const eventStatusBreakdown = await Event.aggregate([
      {
        $group: {
          _id: "$eventStatus",
          count: { $sum: 1 }
        }
      }
    ]);

    // Event category breakdown
    const eventCategoryBreakdown = await Event.aggregate([
      {
        $group: {
          _id: "$eventCategory",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Ticket sales stats
    const ticketStats = await EventTicketOrder.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          ticketsSold: { $sum: { $sum: "$tickets.quantity" } },
          revenue: { $sum: "$totalAmount" }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { date: "$_id", ticketsSold: 1, revenue: 1, _id: 0 } }
    ]);

    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      "Event analytics retrieved successfully",
      {
        eventGrowth,
        eventStatusBreakdown: eventStatusBreakdown.map(e => ({
          status: e._id,
          count: e.count
        })),
        eventCategoryBreakdown: eventCategoryBreakdown.map(e => ({
          category: e._id,
          count: e.count
        })),
        ticketSales: ticketStats,
      }
    );
  } catch (error) {
    printError(error, "httpGetEventAnalytics");
    return ErrorResponse(res);
  }
};

/**
 * Get subscription analytics
 * GET /api/v1/admin/analytics/subscriptions
 */
export const httpGetSubscriptionAnalytics = async (req: Request, res: Response) => {
  try {
    const { period = "30" } = req.query;
    const days = parseInt(period as string) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Subscription growth over time
    const subscriptionGrowth = await UserCreatorSubscriptionModel.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          newSubscriptions: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { date: "$_id", subscriptions: "$newSubscriptions", _id: 0 } }
    ]);

    // Subscription status breakdown
    const subscriptionStatusBreakdown = await UserCreatorSubscriptionModel.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    // Top creators by subscribers
    const topCreators = await UserCreatorSubscriptionModel.aggregate([
      { $match: { status: "active" } },
      {
        $group: {
          _id: "$creatorId",
          subscriberCount: { $sum: 1 }
        }
      },
      { $sort: { subscriberCount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "creator"
        }
      },
      { $unwind: "$creator" },
      {
        $project: {
          creatorId: "$_id",
          subscriberCount: 1,
          username: "$creator.username",
          displayName: "$creator.displayName",
          profilePicture: "$creator.profilePicture",
          _id: 0
        }
      }
    ]);

    const totalActiveSubscriptions = await UserCreatorSubscriptionModel.countDocuments({ status: "active" });

    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      "Subscription analytics retrieved successfully",
      {
        subscriptionGrowth,
        subscriptionStatusBreakdown: subscriptionStatusBreakdown.map(s => ({
          status: s._id,
          count: s.count
        })),
        topCreators,
        totalActiveSubscriptions,
      }
    );
  } catch (error) {
    printError(error, "httpGetSubscriptionAnalytics");
    return ErrorResponse(res);
  }
};

/**
 * Get overview analytics (dashboard summary)
 * GET /api/v1/admin/analytics/overview
 */
export const httpGetOverviewAnalytics = async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Current period stats
    const [
      usersThisMonth,
      creatorsThisMonth,
      contentThisMonth,
      revenueThisMonth,
    ] = await Promise.all([
      UserModel.countDocuments({ createdAt: { $gte: thirtyDaysAgo }, isDeleted: false }),
      UserModel.countDocuments({ 
        membership: MembershipLevel.CREATOR, 
        createdAt: { $gte: thirtyDaysAgo }, 
        isDeleted: false 
      }),
      Promise.all([
        StreamModel.countDocuments({ createdAt: { $gte: thirtyDaysAgo }, isDeleted: false }),
        ShortsModel.countDocuments({ createdAt: { $gte: thirtyDaysAgo }, deletedAt: null }),
        PostModel.countDocuments({ createdAt: { $gte: thirtyDaysAgo }, isDeleted: false }),
      ]).then(([v, s, p]) => v + s + p),
      Promise.all([
        OrderModel.aggregate([
          { $match: { createdAt: { $gte: thirtyDaysAgo }, "payment.status": "success" } },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } }
        ]),
        EventTicketOrder.aggregate([
          { $match: { createdAt: { $gte: thirtyDaysAgo }, paymentStatus: "completed" } },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } }
        ]),
      ]).then(([p, t]) => (p[0]?.total || 0) + (t[0]?.total || 0)),
    ]);

    // Previous period stats (for comparison)
    const [
      usersLastMonth,
      creatorsLastMonth,
      contentLastMonth,
      revenueLastMonth,
    ] = await Promise.all([
      UserModel.countDocuments({ 
        createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }, 
        isDeleted: false 
      }),
      UserModel.countDocuments({ 
        membership: MembershipLevel.CREATOR, 
        createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }, 
        isDeleted: false 
      }),
      Promise.all([
        StreamModel.countDocuments({ createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }, isDeleted: false }),
        ShortsModel.countDocuments({ createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }, deletedAt: null }),
        PostModel.countDocuments({ createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }, isDeleted: false }),
      ]).then(([v, s, p]) => v + s + p),
      Promise.all([
        OrderModel.aggregate([
          { $match: { createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }, "payment.status": "success" } },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } }
        ]),
        EventTicketOrder.aggregate([
          { $match: { createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }, paymentStatus: "completed" } },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } }
        ]),
      ]).then(([p, t]) => (p[0]?.total || 0) + (t[0]?.total || 0)),
    ]);

    // Calculate growth percentages
    const calculateGrowth = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous * 100).toFixed(1);
    };

    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      "Overview analytics retrieved successfully",
      {
        users: {
          current: usersThisMonth,
          previous: usersLastMonth,
          growth: calculateGrowth(usersThisMonth, usersLastMonth),
        },
        creators: {
          current: creatorsThisMonth,
          previous: creatorsLastMonth,
          growth: calculateGrowth(creatorsThisMonth, creatorsLastMonth),
        },
        content: {
          current: contentThisMonth,
          previous: contentLastMonth,
          growth: calculateGrowth(contentThisMonth, contentLastMonth),
        },
        revenue: {
          current: revenueThisMonth,
          previous: revenueLastMonth,
          growth: calculateGrowth(revenueThisMonth, revenueLastMonth),
        },
      }
    );
  } catch (error) {
    printError(error, "httpGetOverviewAnalytics");
    return ErrorResponse(res);
  }
};


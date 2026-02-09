import mongoose, { Types } from "mongoose";
import { STATUS_CODES } from "../../constants/statusCodes";
import { ResultDB, ApiResponse, printError } from "../../utils/responseHandler";
import { CartService, NotificationService } from "..";
import {
  IStoreProductDocument,
  IVariant,
} from "../../models/store/store.types";
import OrderModel from "../../models/orders/order.schema";
import { MESSAGES, ORDER_MESSAGES } from "../../constants/responseMessage";
import { IUserAddress } from "../../models/user/userAddress.schema";
import { EOrderStatus, IOrder } from "../../models/orders/order.types";
import { IPagination } from "../../types/schema";
import {
  NOTIFICATION_BODY,
  NOTIFICATION_TITLE,
} from "../../constants/notification";
import {
  collectionNames,
  ENotificationContentType,
} from "../../constants/collectionNames";
import { IUser } from "../../models/user/user.type";
import { ENotificationType } from "../../models/notification/notification.types";
import { StoreProduct } from "../../models/store/storeProducts.schema";

/**
 * Fetch address of a user based on addressId
 *
 */
export const createOrder = async ({
  userId,
  address,
  products,
  checkoutItems,
  checkoutType,
  creatorId,
}: {
  userId: Types.ObjectId;
  address: IUserAddress;
  products: IStoreProductDocument[];
  checkoutItems: {
    productId: string;
    quantity: number;
    variant: { size: string; color: string; sku: string };
  }[];
  checkoutType: "from_cart" | "buy_now";
  creatorId: string;
}) => {
  // Prepare order items & compute total
  let totalAmount = 0;
  const orderItems = await Promise.all(
    checkoutItems.map(async (item) => {
      const product = products.find(
        (p) => p._id.toString() === item.productId
      )!;
      let itemPrice: number;
      let variantSnapshot: IVariant | undefined;

      if (
        product.hasVariants &&
        product.variants.length > 0 &&
        item.variant &&
        item.variant.sku
      ) {
        const variant = product.variants.find(
          (v) =>
            v.sku === item.variant.sku &&
            (!item.variant.size || v.size === item.variant.size) &&
            (!item.variant.color || v.color === item.variant.color)
        )!;
        itemPrice = variant.price;
        // Only copy necessary fields for audit, feel free to reduce to price/size/color/sku only:
        variantSnapshot = {
          size: variant.size,
          color: variant.color,
          price: variant.price,
          sku: variant.sku,
          stock: variant.stock, // not strictly needed, just for info
        };
      } else {
        itemPrice = product.price;
        variantSnapshot = undefined;
      }

      const lineTotal = itemPrice * item.quantity;
      totalAmount += lineTotal;

      // Reduce product stock here
      if (product.variants.length) {
        const currentVariant = product.variants.find(
          (v) => v.sku === item.variant.sku
        );
        if (currentVariant?.stock) {
          currentVariant.stock = currentVariant.stock - 1;
        }
      } else if (product.stock && !product.variants.length) {
        product.stock = product.stock - 1;
      }

      const updatedProduct = await StoreProduct.findByIdAndUpdate(
        product._id,
        product
      );

      return {
        productId: product._id.toString(),
        productName: product.productName,
        sku: product.sku || "",
        media: product.media,
        variant: variantSnapshot,
        quantity: item.quantity,
        itemPrice,
        lineTotal,
      };
    })
  );

  // TODO : Save order (dummy payment info for now)
  const paymentInfo = {
    paymentId: "fefe122",
    provider: "stipe",
    status: "pending",
  };
 
  const orderDoc = await OrderModel.create({
    userId,
    storeId: products[0].storeId,
    creatorId,
    address: {
      fullName: address.fullName,
      mobileNumber: address.mobileNumber,
      countryCode: address.countryCode,
      streetNo: address.streetNo,
      location: address.location,
      buildingName: address.buildingName,
      city: address.city,
      areaDistrict: address.areaDistrict,
      landmark: address.landmark,
      addressType: address.addressType,
    },
    items: orderItems,
    totalAmount,
    payment: paymentInfo,
  });

  if (checkoutType === "from_cart") {
    await CartService.clearCart({ userId });
  }

  // send notification to creator
  const sentToCreator = await NotificationService.sendNotification({
    userId: String(creatorId),
    senderId: String(userId),
    type: ENotificationType.orderPlace,
    contentId: String(orderDoc._id),
    contentType: collectionNames.ORDER as ENotificationContentType,
    notificationText: NOTIFICATION_BODY.ORDER_PLACED(
      "user",
      String(orderDoc._id)
    ),
    pushNotificationContent: {
      title: NOTIFICATION_TITLE.ORDER_PLACED,
      body: NOTIFICATION_BODY.ORDER_PLACED("user", String(orderDoc._id)),
    },
  });

  // send notification to user
  const sentToUser = await NotificationService.sendNotification({
    userId: String(userId),
    senderId: String(creatorId),
    type: ENotificationType.orderPlace,
    contentId: String(orderDoc._id),
    contentType: collectionNames.ORDER as ENotificationContentType,
    notificationText: NOTIFICATION_BODY.ORDER_PLACED(
      "user",
      String(orderDoc._id)
    ),
    pushNotificationContent: {
      title: NOTIFICATION_TITLE.ORDER_PLACED,
      body: NOTIFICATION_BODY.ORDER_PLACED("user", String(orderDoc._id)),
    },
  });

  return ResultDB(STATUS_CODES.OK, true, ORDER_MESSAGES.ORDER_CREATED, {
    orderId: orderDoc._id,
    amount: orderDoc.totalAmount,
    status: orderDoc.status,
    order: orderDoc,
  });
};

// TODO: Apply mongoose transaction in below function
export const updateOrderStatus = async ({
  orderId,
  status,
  user,
}: {
  orderId: string;
  status: EOrderStatus;
  user: IUser;
}) => {
  const userId = String(user._id);
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // 1. Fetch order inside transaction
    const order = await OrderModel.findById(orderId).session(session);
    if (!order) {
      await session.abortTransaction();
      return ResultDB(
        STATUS_CODES.NOT_FOUND,
        false,
        ORDER_MESSAGES.ORDER_NOT_FOUND,
        null
      );
    }

    // 2. Permission check
    if (order.creatorId.toString() !== userId.toString()) {
      await session.abortTransaction();
      return ResultDB(
        STATUS_CODES.UNAUTHORIZED,
        false,
        MESSAGES.UNAUTHORIZED,
        null
      );
    }

    // 3. Update order status
    order.status = status;
    await order.save();

    // 4. If rejected → restore stock
    if (status === EOrderStatus.REJECTED) {
      const orderProductsIds = order.items.map((i) => i.productId);
      const products = await StoreProduct.find({
        _id: { $in: orderProductsIds },
      }).session(session); // no .lean() so we can save

      for (const product of products) {
        if (product.variants.length) {
          const orderedItemSku = order.items.find(
            (i) => String(i.productId) === String(product._id)
          )?.sku;

          const orderedVariant = product.variants.find(
            (v) => v.sku === orderedItemSku
          );

          if (orderedVariant) {
            orderedVariant.stock = (orderedVariant.stock || 0) + 1;
            product.markModified("variants"); // required for subdocs array
          }
        } else {
          product.stock = (product.stock || 0) + 1;
        }
        await product.save({ session });
      }
    }

    // 5. Commit transaction
    await session.commitTransaction();

    // 6. Send notification after commit (so it’s not sent if DB fails)
    await NotificationService.sendNotification({
      userId: String(order.userId),
      senderId: String(order.creatorId),
      type: ENotificationType.orderStatus,
      contentId: String(order._id),
      contentType: collectionNames.ORDER as ENotificationContentType,
      notificationText: NOTIFICATION_BODY.ORDER_STATUS(
        order.status,
        String(order._id)
      ),
      pushNotificationContent: {
        title: NOTIFICATION_TITLE.ORDER_STATUS,
        body: NOTIFICATION_BODY.ORDER_STATUS(order.status, String(order._id)),
      },
    });

    return ResultDB(STATUS_CODES.OK, true, `Order`, {
      orderId: order._id,
      status: order.status,
    });
  } catch (err) {
    printError(err, "updateOrderStatus");
    await session.abortTransaction();
  } finally {
    await session.endSession();
  }

  return ResultDB(
    STATUS_CODES.INTERNAL_SERVER_ERROR,
    false,
    MESSAGES.INTERNAL_SERVER_ERROR,
    null
  );
};

export const getOrdersList = async (
  creatorId: string,
  page: number,
  limit: number,
  status?: EOrderStatus | "all"
): Promise<ApiResponse<{ orders: any[]; pagination: IPagination }>> => {
  const skip = (page - 1) * limit;
  const totalOrders = await OrderModel.countDocuments({ creatorId });
  const totalPages = Math.ceil(totalOrders / limit);
  const query: { creatorId: string; status?: EOrderStatus } = { creatorId };
  if (status && status !== "all") {
    query.status = status;
  }

  const orders = await OrderModel.find(query)
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 })
    .populate({
      path: "user",
      select: "username displayName profilePicture",
      match: { isDeleted: false },
    });
  const result = orders.map((order) => {
    return {
      user: {
        username: order.user?.username,
        displayName: order.user?.displayName,
        profilePicture: order.user?.profilePicture,
      },
      orderStatus: order.status,
      orderId: order._id,
      orderedAt: order.createdAt,
    };
  });
  return ResultDB(STATUS_CODES.OK, true, "Orders fetched successfully", {
    orders: result,
    pagination: {
      totalRecords: totalOrders,
      currentPage: page,
      limit,
      totalPages,
    },
  });
};

export const getOrderById = async (id: string) => {
  const order = await OrderModel.findById(id).populate({
    path: "creator",
    select: "username displayName profilePicture",
    match: { isDeleted: false },
  });
  if (!order) {
    return ResultDB(
      STATUS_CODES.NOT_FOUND,
      false,
      ORDER_MESSAGES.ORDER_NOT_FOUND,
      null
    );
  }
  return ResultDB(STATUS_CODES.OK, true, "Order fetched successfully", {
    order,
  });
};

export const getOrderHistory = async (
  userId: string,
  page: number,
  limit: number,
  status?: EOrderStatus
) => {
  const query: any = { userId };
  if (status) {
    query.status = status;
  }
  const orders = await OrderModel.find(query)
    .populate({
      path: "creator",
      select: "username displayName profilePicture",
      match: { isDeleted: false },
    })
    .sort({ createdAt: -1 });
  const totalOrders = await OrderModel.countDocuments({ userId });
  const totalPages = Math.ceil(totalOrders / limit);
  return ResultDB(STATUS_CODES.OK, true, "Order history fetched successfully", {
    orders,
    pagination: {
      totalRecords: totalOrders,
      currentPage: page,
      limit,
      totalPages,
    },
  });
};

export const getUserOrdersCount = async (userId: string) => {
  const orders = await OrderModel.countDocuments({ userId });
  return orders;
};

// services/CartService.ts
import { Types } from "mongoose";
import { StoreProduct } from "../../models/store/storeProducts.schema";
import { ResultDB } from "../../utils/responseHandler";
import { STATUS_CODES } from "../../constants/statusCodes";
import CartModel from "../../models/cart/cart.schema";

// export const addToCart = async ({
//   userId,
//   productId,
//   storeId,
//   variant,
//   quantity,
// }: {
//   userId: Types.ObjectId;
//   productId: Types.ObjectId;
//   storeId: Types.ObjectId;
//   variant: { size: string; color?: string; sku: string; price: number };
//   quantity: number;
// }) => {
//   // Validate product exists and is live
//   const product = await StoreProduct.findOne({
//     _id: productId,
//     storeId,
//     status: "live",
//   }).lean();
//   if (!product) {
//     return ResultDB(STATUS_CODES.NOT_FOUND, false, "Product not found");
//   }

//   // Find the correct variant in the product
//   const foundVariant = product.variants.find(
//     (v: any) =>
//       v.sku === variant.sku &&
//       v.size === variant.size &&
//       (!variant.color || v.color === variant.color)
//   );
//   if (!foundVariant) {
//     return ResultDB(STATUS_CODES.NOT_FOUND, false, "Variant not found");
//   }
//   if (foundVariant.stock < quantity) {
//     return ResultDB(
//       STATUS_CODES.BAD_REQUEST,
//       false,
//       "Insufficient stock for this variant"
//     );
//   }

//   // Find or create cart
//   let cart = await CartModel.findOne({ userId });
//   if (!cart) {
//     cart = await CartModel.create({ userId, items: [] });
//   }

//   // Check if item already exists in cart (match product+variant sku/size/color)
//   const existingIndex = cart.items.findIndex(
//     (item) =>
//       item.productId.equals(productId) &&
//       item.variant.sku === variant.sku &&
//       item.variant.size === variant.size &&
//       (!variant.color || item.variant.color === variant.color)
//   );

//   if (existingIndex !== -1) {
//     // Update quantity (sum, or set to new value as per your UX)
//     cart.items[existingIndex].quantity += quantity;
//   } else {
//     // Add new item
//     cart.items.push({ productId, storeId, variant, quantity });
//   }
//   cart.lastUpdated = new Date();
//   await cart.save();

//   return ResultDB(STATUS_CODES.OK, true, "Added to cart", cart);
// };

export const addToCart = async ({
  userId,
  productId,
  storeId,
  variant,
  quantity,
}: {
  userId: Types.ObjectId;
  productId: Types.ObjectId;
  storeId: Types.ObjectId;
  variant?: { size?: string; color?: string; sku?: string; price?: number };
  quantity: number;
}) => {
  const product = await StoreProduct.findOne({
    _id: productId,
    storeId,
    status: "live",
  }).lean();
  if (!product) {
    return ResultDB(STATUS_CODES.NOT_FOUND, false, "Product not found");
  }

  // Check if user cart already has products from another store
  let cart = await CartModel.findOne({ userId });
  if (cart && cart.items.length > 0) {
    const existingStoreId = cart.items[0].storeId;
    if (!existingStoreId.equals(storeId)) {
      return ResultDB(
        STATUS_CODES.BAD_REQUEST,
        false,
        "Your cart contains items from another store. Clear cart to add this product"
      );
    }
  }

  let cartVariant;
  if (product.variants && product.variants.length > 0) {
    // Must select a variant
    if (!variant || !variant.sku) {
      return ResultDB(
        STATUS_CODES.BAD_REQUEST,
        false,
        "Variant required for this product"
      );
    }
    const foundVariant = product.variants.find(
      (v: any) =>
        v.sku === variant.sku &&
        (!variant.size || v.size === variant.size) &&
        (!variant.color || v.color === variant.color)
    );
    if (!foundVariant) {
      return ResultDB(STATUS_CODES.NOT_FOUND, false, "Variant not found");
    }
    if (foundVariant.stock < quantity) {
      return ResultDB(
        STATUS_CODES.BAD_REQUEST,
        false,
        "Insufficient stock for this variant"
      );
    }
    cartVariant = {
      size: foundVariant.size,
      color: foundVariant.color || "",
      sku: foundVariant.sku,
      price: foundVariant.price,
    };
  } else {
    // No variants
    if ((product.stock as number) < quantity) {
      return ResultDB(
        STATUS_CODES.BAD_REQUEST,
        false,
        "Insufficient stock for this product"
      );
    }
    cartVariant = {
      size: "",
      color: "",
      sku: product.sku || "",
      price: product.price,
    };
  }

  // Now, cartVariant always exists; continue with cart logic as before
  if (!cart) {
    cart = await CartModel.create({ userId, items: [] });
  }

  const existingIndex = cart.items.findIndex(
    (item) =>
      item.productId.equals(productId) &&
      item.variant.sku === cartVariant.sku &&
      (cartVariant.size === undefined ||
        item.variant.size === cartVariant.size) &&
      (cartVariant.color === undefined ||
        item.variant.color === cartVariant.color)
  );

  if (existingIndex !== -1) {
    cart.items[existingIndex].quantity += quantity;
  } else {
    cart.items.push({ productId, storeId, variant: cartVariant, quantity });
  }
  cart.lastUpdated = new Date();
  await cart.save();

  return ResultDB(STATUS_CODES.OK, true, "Added to cart", cart);
};

// export const getCart = async ({ userId }: { userId: Types.ObjectId }) => {
//   const cart = await CartModel.findOne({ userId }).populate({
//     path: "items.productId",
//     select: "productName media status storeId",
//   });
//   return ResultDB(STATUS_CODES.OK, true, "Fetched cart", cart);
// };

export const getCart = async ({
  userId,
  page = 1,
  limit = 10,
}: {
  userId: Types.ObjectId;
  page?: number;
  limit?: number;
}) => {
  const cart = await CartModel.findOne({ userId })
    .populate({
      path: "items.productId",
      select: "productName media status storeId",
      populate: {
        path: "storeId",
        select: "name logo",
      },
    })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
  if (!cart) {
    return ResultDB(STATUS_CODES.OK, true, "Fetched cart", {
      cart: null,
      totalPrice: 0,
      totalCartItems: 0,
      pagination: {
        page,
        limit,
        totalItems: 0,
        totalPages: 0,
      },
    });
  }

  // Compute total
  const totalPrice = cart
    ? cart.items.reduce(
        (sum, item) => sum + item.variant.price * item.quantity,
        0
      )
    : 0;

  const totalCartItems = cart
    ? cart.items.reduce((sum, item) => sum + item.quantity, 0)
    : 0;

  const totalItems = cart.items.length;
  const totalPages = Math.ceil(totalItems / limit);

  // Paginate items
  const paginatedItems = cart.items.slice((page - 1) * limit, page * limit);

  // You may want to return the cart with only paginated items
  const paginatedCart = {
    ...cart,
    items: paginatedItems,
  };
  return ResultDB(STATUS_CODES.OK, true, "Fetched cart", {
    cart: paginatedCart,
    totalPrice,
    totalCartItems,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages,
    },
  });
};

// export const removeFromCart = async ({
//   userId,
//   productId,
//   variant, // { size, color, sku }
// }: {
//   userId: Types.ObjectId;
//   productId: Types.ObjectId;
//   variant: { size: string; color?: string; sku: string };
// }) => {
//   // Find cart
//   const cart = await CartModel.findOne({ userId });
//   if (!cart) {
//     return ResultDB(STATUS_CODES.NOT_FOUND, false, "Cart not found");
//   }

//   // Remove the specific item (match productId and all variant keys)
//   const initialCount = cart.items.length;
//   cart.items = cart.items.filter(
//     (item) =>
//       !(
//         item.productId.equals(productId) &&
//         item.variant.sku === variant.sku &&
//         item.variant.size === variant.size &&
//         (!variant.color || item.variant.color === variant.color)
//       )
//   );
//   if (cart.items.length === initialCount) {
//     return ResultDB(STATUS_CODES.NOT_FOUND, false, "Item not found in cart");
//   }

//   cart.lastUpdated = new Date();
//   await cart.save();

//   return ResultDB(STATUS_CODES.OK, true, "Removed from cart", cart);
// };

export const removeFromCart = async ({
  userId,
  productId,
  variant, // { sku, size?, color? }
}: {
  userId: Types.ObjectId;
  productId: Types.ObjectId;
  variant: { sku: string; size?: string; color?: string };
}) => {
  const cart = await CartModel.findOne({ userId });
  if (!cart) {
    return ResultDB(STATUS_CODES.NOT_FOUND, false, "Cart not found");
  }

  const initialCount = cart.items.length;
  cart.items = cart.items.filter((item) => {
    // Match productId and sku first
    if (!item.productId.equals(productId)) return true;
    if (item.variant.sku !== variant.sku) return true;
    // Only match size if provided in variant payload
    if (variant.size !== undefined && variant.size !== "") {
      if (item.variant.size !== variant.size) return true;
    }
    // Only match color if provided in variant payload
    if (variant.color !== undefined && variant.color !== "") {
      if (item.variant.color !== variant.color) return true;
    }
    // All relevant fields match: filter OUT this item (i.e. remove)
    return false;
  });

  if (cart.items.length === initialCount) {
    return ResultDB(STATUS_CODES.NOT_FOUND, false, "Item not found in cart");
  }

  cart.lastUpdated = new Date();
  await cart.save();

  return ResultDB(STATUS_CODES.OK, true, "Removed from cart", cart);
};

export const clearCart = async ({ userId }: { userId: Types.ObjectId }) => {
  const cart = await CartModel.findOne({ userId });
  if (!cart) {
    return ResultDB(STATUS_CODES.NOT_FOUND, false, "Cart not found");
  }

  cart.items = [];
  cart.lastUpdated = new Date();
  await cart.save();

  return ResultDB(STATUS_CODES.OK, true, "Cart cleared", cart);
};

export const updateCartQuantity = async ({
  userId,
  productId,
  variant,
  quantity,
}: {
  userId: Types.ObjectId;
  productId: Types.ObjectId;
  variant: { sku: string; size?: string; color?: string };
  quantity: number;
}) => {
  const cart = await CartModel.findOne({ userId });
  if (!cart) {
    return ResultDB(STATUS_CODES.NOT_FOUND, false, "Cart not found");
  }

  const item = cart.items.find(
    (item) =>
      item.productId.equals(productId) && item.variant.sku === variant.sku
  );
  if (!item) {
    return ResultDB(STATUS_CODES.NOT_FOUND, false, "Item not found in cart");
  }

  item.quantity = quantity;
  cart.lastUpdated = new Date();
  await cart.save();

  const totalCartItems = cart
    ? cart.items.reduce((sum, item) => sum + item.quantity, 0)
    : 0;
  return ResultDB(
    STATUS_CODES.OK,
    true,
    "Cart quantity updated",
    totalCartItems
  );
};

export const getUserCart = async (userId: Types.ObjectId): Promise<any> => {
  console.log("Fetching cart for user:", userId);
  const items = await CartModel.findOne({ userId });
  return items;
};

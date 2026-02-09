import { NextFunction, Request, Response } from "express";
import {
  BadRequestErrorResponse,
  NotFoundErrorResponse,
} from "../utils/responseHandler";
import { AuthenticatedRequest } from "../types/express";
import UserAddressService from "../services/userService/userAddress.service";
import {
  ORDER_MESSAGES,
  PRODUCT_MESSAGES,
  STORE_MESSAGES,
} from "../constants/responseMessage";
import { ProductService, StoreService } from "../services";
import { IPopulatedProduct, IVariant } from "../models/store/store.types";

const orderMiddleware = {
  hasValidAddress: async (req: Request, res: Response, next: NextFunction) => {
    const { addressId } = req.body;
    const user = (req as AuthenticatedRequest).user;
    const addressDoc = await UserAddressService.getAddressById(
      user?._id.toString(),
      addressId
    );
    if (!addressDoc.success) {
      return NotFoundErrorResponse(res, ORDER_MESSAGES.ADDRESS_NOT_FOUND);
    }
    req.body.address = addressDoc.data;
    next();
  },

  hasValidProducts: async (req: Request, res: Response, next: NextFunction) => {
    const checkoutItems: {
      productId: string;
      quantity: number;
      variant: { size: string; color: string; sku: string };
    }[] = req.body.checkoutItems;

    const productIds = checkoutItems.map((item) => item.productId);
    const products = await ProductService.getProductsByIds({ productIds });
    const firstProductStoreId = String(products[0].storeId);

    // 1. All items must be from the same store
    const allSameStore = products.every(
      (product) => product.storeId.toString() === firstProductStoreId
    );
    if (!allSameStore) {
      return BadRequestErrorResponse(res, PRODUCT_MESSAGES.INVALID_STORE_ITEM);
    }

    // 2. If store does not exists, or owner does not exists, return
    // To handle the case, user had products in cart from store and owner deleted account
    const store = (products[0] as IPopulatedProduct).store;
    if (!store || !store._id || !store.owner || !store.owner._id) {
      return NotFoundErrorResponse(res, STORE_MESSAGES.STORE_NOT_FOUND);
    }

    // 3. check variant and stock for all items
    for (const item of checkoutItems) {
      const product = products.find((p) => p._id.toString() === item.productId);
      if (!product) {
        return NotFoundErrorResponse(res, PRODUCT_MESSAGES.PRODUCT_NOT_FOUND);
      }
      if (product.hasVariants && product.variants.length > 0) {
        if (!item.variant || !item.variant.sku) {
          return BadRequestErrorResponse(
            res,
            PRODUCT_MESSAGES.VARIANT_REQUIRED
          );
        }

        const variant = product.variants.find(
          (v: IVariant) =>
            v.sku === item.variant.sku &&
            (!item.variant.size || v.size === item.variant.size) &&
            (!item.variant.color || v.color === item.variant.color)
        );

        if (!variant) {
          return BadRequestErrorResponse(
            res,
            PRODUCT_MESSAGES.VARIANT_NOT_FOUND
          );
        }

        if (variant.stock < item.quantity) {
          return BadRequestErrorResponse(
            res,
            PRODUCT_MESSAGES.INSUFFICIENT_STOCK
          );
        }
      } else {
        // No variants, check product.stock
        if (
          typeof product.stock !== "number" ||
          product.stock < item.quantity
        ) {
          return BadRequestErrorResponse(
            res,
            PRODUCT_MESSAGES.INSUFFICIENT_STOCK
          );
        }
      }
    }
    req.body.products = products;
    req.body.storeOwnerId = store.owner._id;
    next();
  },
};

export default orderMiddleware;

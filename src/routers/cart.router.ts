import { Router } from "express";
import authenticate from "../middlewares/authenticate";
import { validator } from "../middlewares/validator";
import {
  addToCartSchema,
  removeFromCartSchema,
} from "../validators/cart.validator";
import { CartController } from "../controllers";

const cartRouter = Router();

cartRouter.use(authenticate);

// Get user's cart
cartRouter.get("/", CartController.httpGetCart);

// Add item to cart
cartRouter.post(
  "/add",
  validator.body(addToCartSchema.body),
  CartController.httpAddToCart
);

// Remove item from cart
cartRouter.post(
  "/remove",
  validator.body(removeFromCartSchema.body),
  CartController.httpRemoveFromCart
);

cartRouter.patch("/quantity", CartController.httpUpdateCartQuantity);

// Clear entire cart
cartRouter.delete("/clear", CartController.httpClearCart);

export default cartRouter;

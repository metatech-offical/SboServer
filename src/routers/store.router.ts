import { Router } from "express";
import authenticate from "../middlewares/authenticate";
import { validator } from "../middlewares/validator";

import {
  createCollectionSchema,
  createProductSchema,
  createStoreSchema,
  getCollectionByIdSchema,
  getCollectionsOfAStoreSchema,
  getCollectionsSchema,
  getProductByIdSchema,
  getProductsSchema,
  getStoresSchema,
  updateCollectionSchema,
  updateProductSchema,
} from "../validators/store.validator";
import { isCreator } from "../middlewares/creator.middleware";
import {
  CollectionsController,
  ProductController,
  StoreController,
} from "../controllers";

const storeRouter = Router();
storeRouter.use(authenticate);

storeRouter.get(
  "/all-stores",
  validator.query(getStoresSchema.query),
  StoreController.httpGetStores
);

storeRouter.get(
  "/pre-signed-url",
  isCreator,
  StoreController.httpGetMerchandisePresignedUrl
);

storeRouter.get(
  "/store-analytics",
  isCreator,
  StoreController.httpGetStoreAnalytics
);

storeRouter.get(
  "/global-return-policy",
  isCreator,
  StoreController.httpGetGlobalReturnPolicy
);

storeRouter.get(
  "/all-collections",
  validator.body(getCollectionsSchema.query),
  CollectionsController.httpGetCollections
);

storeRouter.get(
  "/get-collections-from-all-stores",
  validator.body(getCollectionsSchema.query),
  CollectionsController.httpGetCollectionsFromAllStore
);

storeRouter.get(
  "/get-collections-of-store/:storeId",
  validator.params(getCollectionsOfAStoreSchema.params),
  validator.query(getCollectionsOfAStoreSchema.query),
  CollectionsController.httpGetCollectionsOfAStore
);

storeRouter.get(
  "/collection/:collectionId",
  validator.params(getCollectionByIdSchema.params),
  CollectionsController.httpGetCollectionById
);

storeRouter.put(
  "/update-collection/:collectionId",
  isCreator,
  validator.params(updateCollectionSchema.params),
  validator.body(updateCollectionSchema.body),
  CollectionsController.httpUpdateCollection
);
storeRouter.get(
  "/all-products",
  validator.query(getProductsSchema.query),
  ProductController.httpGetProducts
);
storeRouter.get(
  "/all-products-by-collection",
  validator.query(getProductsSchema.query),
  ProductController.httpGetProductsByCollection
);

storeRouter.get(
  "/product/:productId",
  validator.params(getProductByIdSchema.params),
  ProductController.httpGetProductById
);

storeRouter.get("/get-wishlist", ProductController.httpGetUserWishlist);

storeRouter.post(
  "/create",
  isCreator,
  validator.body(createStoreSchema.body),
  StoreController.httpCreateStore
);

storeRouter.post(
  "/create-collection",
  isCreator,
  validator.body(createCollectionSchema.body),
  CollectionsController.httpCreateCollection
);
storeRouter.post(
  "/add-product",
  isCreator,
  validator.body(createProductSchema.body),
  ProductController.httpCreateProduct
);

storeRouter.put(
  "/update-product/:id",
  isCreator,
  validator.params(updateProductSchema.params),
  validator.body(updateProductSchema.body),
  ProductController.httpUpdateProduct
);

storeRouter.post(
  "/add-item-wishlist/:productId",
  validator.params(getProductByIdSchema.params),
  ProductController.httpAddToWishlist
);

storeRouter.delete(
  "/remove-item-wishlist/:productId",
  validator.params(getProductByIdSchema.params),
  ProductController.httpRemoveFromWishlist
);

storeRouter.delete(
  "/product/remove/:productId",
  validator.params(getProductByIdSchema.params),
  ProductController.httpRemoveProduct
);
export default storeRouter;

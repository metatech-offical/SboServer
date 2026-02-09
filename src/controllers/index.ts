//Imports from Auth controller
import * as AuthController from "./authControllers/auth.controller";
import * as SignupController from "./authControllers/signup.controller";

//Imports from User controller
import * as UserController from "./userController/user.controller";
import * as ShortsController from "./shortController/short.controller";
import * as StreamController from "./streamController/stream.controller";
import * as LiveStreamController from "./streamController/livestream.controller";

import * as contentActionsController from "./contentActionControllers/contentAction.controller";
import * as AboutController from "./about.controller";
import * as ReportProblemController from "./reportProblem.controller";
import * as NotificationController from "./notification.controller";
import * as UserAddressController from "./userController/address.controller";

import * as PlaylistController from "./playlistControllers/playlist.controller";

import * as StoreController from "./storeControllers/store.controller";
import * as CollectionsController from "./storeControllers/collections.controller";
import * as ProductController from "./storeControllers/product.controller";
import * as CategoryController from "./categoryController/category.controller";
import * as PostController from "./postControllers/post.controller";
import * as SearchController from "./searchController/search.controller";
import * as CartController from "./cartController/cart.controller";
import * as OrderController from "./orderControllers/order.controller";
import * as SubscriptionController from "./subscriptionControllers/subscription.controller";
import * as EventController from "./eventControllers/event.controller";
import * as TicketOrderController from "./eventControllers/ticketOrder.controller";

export {
  AboutController,
  UserController,
  AuthController,
  SignupController,
  NotificationController,
  StoreController,
  CollectionsController,
  ProductController,
  ShortsController,
  contentActionsController,
  ReportProblemController,
  PlaylistController,
  CategoryController,
  PostController,
  SearchController,
  CartController,
  UserAddressController,
  StreamController,
  OrderController,
  SubscriptionController,
  LiveStreamController,
  EventController,
  TicketOrderController,
};

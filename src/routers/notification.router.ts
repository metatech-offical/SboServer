import { Router } from "express";
import {
  httpGetUserNotifications,
  httpMarkNotificationsAsRead,
  httpGetUnreadNotificationsCount,
} from "../controllers/notification.controller";
import authenticate from "../middlewares/authenticate";
import { notificationListValidator } from "../validators/notification.validator";
import { validator } from "../middlewares/validator";

const notificationRouter = Router();

notificationRouter.use(authenticate);
notificationRouter.get(
  "/",
  validator.query(notificationListValidator.query),
  httpGetUserNotifications
);
notificationRouter.post("/read", httpMarkNotificationsAsRead);
notificationRouter.get("/unreadCount", httpGetUnreadNotificationsCount);
export default notificationRouter;

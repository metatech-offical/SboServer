import { Router } from "express";
import { validator } from "../middlewares/validator";
import authenticate from "../middlewares/authenticate";
import {
  addCommentValidator,
  addShareRecordValidator,
  contentTypeValidator,
  likeContentValidator,
  paginationQueryValidator,
  paramsCommentIdValidator,
  paramsContentIdValidator,
  saveContentValidator,
  viewContentValidator,
  createReportValidator,
  addToNotInterestedValidator,
  removeFromNotInterestedValidator,
  presignedUrlQueryValidator,
} from "../validators/contentAction.validator";
import { contentActionsController } from "../controllers";
import upload from "../middlewares/upload";
import { contentActionMiddleware } from "../middlewares/contentAction.middleware";

const contentActionRouter = Router();
contentActionRouter.use(authenticate);

contentActionRouter.post(
  "/upload-cover",
  upload.single("file"),
  contentActionsController.httpUploadCover
);

contentActionRouter.get(
  "/presigned-url",
  validator.query(presignedUrlQueryValidator),
  contentActionsController.httpGeneratePreSignedUrl
);

// APIs related views
contentActionRouter.post(
  "/view/:contentId",
  validator.params(paramsContentIdValidator),
  validator.body(viewContentValidator),
  contentActionsController.httpAddViewOnContent
);

// APIs related likes
contentActionRouter.post(
  "/like/:contentId",
  validator.params(paramsContentIdValidator),
  validator.body(likeContentValidator.body),
  contentActionMiddleware.isValidContent,
  contentActionsController.httpLikeOrUnlikeContent
);

// APIs related saves
contentActionRouter.post(
  "/save/:contentId",
  validator.params(paramsContentIdValidator),
  validator.body(saveContentValidator.body),
  contentActionsController.httpSaveOrUnsaveContent
);

contentActionRouter.get(
  "/saved-items/:contentType",
  validator.params(contentTypeValidator),
  contentActionsController.httpGetUserSavedItems
);

// APIs related comments
contentActionRouter.post(
  "/comment/create",
  validator.body(addCommentValidator.body),
  contentActionsController.httpAddComment
);

contentActionRouter.get(
  "/comment/:contentId",
  validator.params(paramsContentIdValidator),
  validator.query(paginationQueryValidator),
  contentActionsController.httpGetCommentsByContentId
);

contentActionRouter.get(
  "/comment/:commentId/replies",
  validator.params(paramsCommentIdValidator),
  validator.query(paginationQueryValidator),
  contentActionsController.httpGetCommentReplies
);

contentActionRouter.delete(
  "/comment/:commentId",
  validator.params(paramsCommentIdValidator),
  contentActionsController.httpDeleteComment
);

contentActionRouter.post(
  "/share",
  validator.body(addShareRecordValidator),
  contentActionsController.httpCreateShareRecord
);

contentActionRouter.post(
  "/report",
  validator.body(createReportValidator),
  contentActionMiddleware.isContentReported,
  contentActionsController.httpCreateReport
);

contentActionRouter.post(
  "/not-interested/add",
  validator.body(addToNotInterestedValidator),
  contentActionMiddleware.isMarkedNotInterested,
  contentActionsController.httpAddToNotInterested
);

contentActionRouter.delete(
  "/not-interested/remove",
  validator.body(removeFromNotInterestedValidator),
  contentActionsController.httpRemoveFromNotInterested
);

export default contentActionRouter;

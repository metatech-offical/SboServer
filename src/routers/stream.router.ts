import { Router } from "express";
import { LiveStreamController, StreamController } from "../controllers";
import authenticate from "../middlewares/authenticate";
import { isCreator } from "../middlewares/creator.middleware";
import {
  createStreamSchema,
  createLiveStreamSchema,
  streamIdSchema,
  queryStreamsValidator,
  getLiveStreamByUserIdSchema,
  getAllLiveStreamsSchema,
  getSubscribedStreamsQuery,
  toggleSaveVodSchema,
  getUserVodsQuery,
  getCreatorVodsParams,
  getCreatorVodsQuery,
} from "../validators/stream.validator";
import { validator } from "../middlewares/validator";
import { paginationQueryValidator } from "../validators";

const streamRouter = Router();

streamRouter.post(
  "/livestream-started",
  LiveStreamController.httpStreamStarted
);

streamRouter.post("/cloud-recording", LiveStreamController.httpCloudRecording);
streamRouter.post("/livestream-ended", LiveStreamController.httpStreamEnded);
streamRouter.use(authenticate);
streamRouter.get(
  "/live-streams",
  validator.query(getAllLiveStreamsSchema),
  LiveStreamController.httpGetAllLiveStreams
);
streamRouter.get(
  "/live-streams/:userId",
  validator.params(getLiveStreamByUserIdSchema),
  LiveStreamController.httpGetLiveStreamByUserId
);

streamRouter.get("/carousel", StreamController.httpGetStreamsForCarousel);
streamRouter.get(
  "/my-subscribed-streams",
  validator.query(getSubscribedStreamsQuery),
  StreamController.httpGetSubscribedStreams
);

streamRouter.post(
  "/create",
  isCreator,
  validator.body(createStreamSchema),
  StreamController.httpCreateStream
);

streamRouter.post(
  "/create-livestream",
  validator.body(createLiveStreamSchema),
  LiveStreamController.httpCreateLiveStream
);

streamRouter.post("/videos/initiate", StreamController.httpInitiateUpload);
streamRouter.post(
  "/videos/presigned-urls",
  StreamController.httpGeneratePresignedUrls
);
streamRouter.post("/videos/complete", StreamController.httpCompleteUpload);
streamRouter.delete(
  "/:streamId",
  validator.params(streamIdSchema),
  StreamController.httpDeleteStream
);

streamRouter.get(
  "/data/:streamId",
  validator.params(streamIdSchema),
  StreamController.httpGetStreamById
);

streamRouter.get(
  "/filtered-data",
  validator.query(queryStreamsValidator),
  StreamController.httpGetStreams
);
streamRouter.get(
  "/trending",
  validator.query(paginationQueryValidator),
  StreamController.httpGetTrendingStreams
);

streamRouter.patch(
  "/:streamId/save-vod",
  validator.params(streamIdSchema),
  validator.body(toggleSaveVodSchema),
  StreamController.httpToggleSaveVod
);

streamRouter.get(
  "/my-vods",
  validator.query(getUserVodsQuery),
  StreamController.httpGetUserVods
);

streamRouter.get(
  "/vods/:creatorId",
  validator.params(getCreatorVodsParams),
  validator.query(getCreatorVodsQuery),
  StreamController.httpGetCreatorVods
);

export default streamRouter;

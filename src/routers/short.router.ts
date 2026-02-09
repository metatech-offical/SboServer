import { Router } from "express";
import { validator } from "../middlewares/validator";
import { ShortsController } from "../controllers";
import authenticate from "../middlewares/authenticate";
import {
  createShortSchema,
  paramsShortIdValidator,
  queryShortsValidator,
  queryRecommendedShortsValidator,
} from "../validators/short.validator";
import { isCreator } from "../middlewares/creator.middleware";
import { paginationQueryValidator } from "../validators";

const shortsRouter = Router();

shortsRouter.use(authenticate);

shortsRouter.post(
  "/create",
  isCreator,
  validator.body(createShortSchema),
  ShortsController.httpCreateShorts
);

shortsRouter.get(
  "/filtered-data",
  validator.query(queryShortsValidator),
  ShortsController.httpGetShorts
);

shortsRouter.get(
  "/trending",
  validator.query(paginationQueryValidator),
  ShortsController.httpGetTrendingShorts
);

shortsRouter.get(
  "/recommended",
  validator.query(queryRecommendedShortsValidator),
  ShortsController.httpGetRecommendedShorts
);

shortsRouter.get(
  "/data/:shortId",
  validator.params(paramsShortIdValidator),
  ShortsController.httpGetShortById
);

shortsRouter.delete(
  "/data/:shortId",
  validator.params(paramsShortIdValidator),
  ShortsController.httpDeleteShortById
);

export default shortsRouter;

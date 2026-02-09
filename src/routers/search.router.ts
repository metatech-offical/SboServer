import { Router } from "express";
import authenticate from "../middlewares/authenticate";
import { SearchController } from "../controllers";

const searchRouter = Router();
searchRouter.use(authenticate);

searchRouter.get("/", SearchController.httpSearch);
searchRouter.delete("/", SearchController.httpDeleteSearchKeyword);
searchRouter.get("/trending", SearchController.httpGetGlobalTrendingSearches);

export default searchRouter;

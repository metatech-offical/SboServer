import { Router } from "express";
import authenticate from "../middlewares/authenticate";
import { validator } from "../middlewares/validator";
import {
  createPostValidator,
  deletePostValidator,
  getPostsByUserIdParamsValidator,
  getPostsByUserIdQueryValidator,
} from "../validators/post.validator";
import { PostController } from "../controllers";
import { isCreator } from "../middlewares/creator.middleware";

const postRouter = Router();

postRouter.use(authenticate);

postRouter.post(
  "/create-post",
  isCreator,
  validator.body(createPostValidator),
  PostController.httpCreatePost
);

postRouter.delete(
  "/delete-post/:postId",
  isCreator,
  validator.params(deletePostValidator),
  PostController.httpDeletePost
);

postRouter.get(
  "/user/:userId",
  validator.params(getPostsByUserIdParamsValidator),
  validator.query(getPostsByUserIdQueryValidator),
  PostController.httpGetPostsByUserId
);

export default postRouter;

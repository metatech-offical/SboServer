import express from "express";
import { CategoryController } from "../controllers";
import {
  CreateBulkCategoriesValidator,
  CreateCategoryValidator,
} from "../validators/category.validator";
import { validator } from "../middlewares/validator";

const categoryRouter = express.Router();

categoryRouter.post(
  "/",
  validator.body(CreateCategoryValidator),
  CategoryController.httpCreateCategory
);

categoryRouter.post(
  "/create-bulk",
  validator.body(CreateBulkCategoriesValidator),
  CategoryController.httpCreateCategoriesInBulk
);
categoryRouter.get("/list", CategoryController.httpFetchCategoriesList);

export default categoryRouter;

import { Schema, model } from "mongoose";
import { ICategory } from "./category.type";
import { collectionNames } from "../../constants/collectionNames";

const CategorySchema = new Schema<ICategory>(
  {
    categoryName: { type: String, required: true },
    subCategories: [{ type: String, required: true }],
  },
  { timestamps: true }
);

const CategoryModel = model<ICategory>(
  collectionNames.CATEGORY,
  CategorySchema
);

export default CategoryModel;

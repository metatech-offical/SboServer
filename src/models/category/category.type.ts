import { Document } from "mongoose";

export interface ICategory extends Document {
  categoryName: string;
  subCategories: string[];
  createdAt: Date;
  updatedAt: Date;
}

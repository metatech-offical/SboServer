import CategoryModel from "../models/category/category.schema";
import { ICategory } from "../models/category/category.type";

export const createCategory = async (category: Partial<ICategory>) => {
  try {
    const result = await CategoryModel.create(category);
    return {
      success: true,
      message: "Category created successfully",
      data: result,
      statusCode: 200,
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to create category",
      data: null,
      statusCode: 500,
    };
  }
};

export const createCategoriesInBulk = async (
  categories: Partial<ICategory>[]
) => {
  try {
    const result = await CategoryModel.insertMany(categories);
    return {
      success: true,
      message: "Categories created successfully",
      data: result,
      statusCode: 200,
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to create categories",
      data: null,
      statusCode: 500,
    };
  }
};

export const fetchCategoriesList = async () => {
  try {
    const result = await CategoryModel.find({});
    return {
      success: true,
      message: "Categories fetched successfully",
      data: result,
      statusCode: 200,
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to fetch categories",
      data: null,
      statusCode: 500,
    };
  }
};

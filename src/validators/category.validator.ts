import Joi from "joi";

export const CreateCategoryValidator = Joi.object({
  categoryName: Joi.string().required(),
  subCategories: Joi.array().items(Joi.string()).required(),
});

export const CreateBulkCategoriesValidator = Joi.array()
  .items(
    Joi.object({
      category: Joi.string().required(),
      subCategories: Joi.array().items(Joi.string()).required(),
    })
  )
  .required();

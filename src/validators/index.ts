import Joi from "joi";

export const paginationQueryValidator = Joi.object({
    page: Joi.number().min(1).optional().default(1).label("Page Number"),
    limit: Joi.number().min(1).max(100).optional().default(10).label("Limit"),
});

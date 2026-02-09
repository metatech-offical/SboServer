import Joi from "joi";

export const notificationListValidator = {
    query: Joi.object({
        page: Joi.number().integer().min(1).optional().default(1),
        limit: Joi.number().integer().min(1).max(100).optional().default(20),
        type: Joi.string().optional().default("all"),
        fromDate: Joi.string().optional().allow(""),
        toDate: Joi.string().optional().allow(""),
        search: Joi.string().optional().allow(""),
    }),
};

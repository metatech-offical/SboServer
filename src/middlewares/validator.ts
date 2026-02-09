import Joi from "joi";
import * as ExpressJoiValidation from "express-joi-validation";

const validator = ExpressJoiValidation.createValidator({ passError: true });

export { validator, Joi };

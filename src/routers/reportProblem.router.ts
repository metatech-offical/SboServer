import { Router } from "express";
import { validator } from "../middlewares/validator";
import { uploadReportImages } from "../middlewares/upload";
import authenticate from "../middlewares/authenticate";
import { reportProblemValidator } from "../validators/reportProblem.validator";
import { ReportProblemController } from "../controllers";

const reportProblemRouter = Router();

reportProblemRouter.use(authenticate);

reportProblemRouter.post(
  "/",
  uploadReportImages.array("files", 5),
  validator.body(reportProblemValidator),
  ReportProblemController.httpReportProblem
);

export default reportProblemRouter;

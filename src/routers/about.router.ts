import { Router } from "express";
import { AboutController } from "../controllers";

const aboutRouter = Router();
aboutRouter.get("/privacy-policy", AboutController.httpGetPrivacyPolicy);
aboutRouter.get("/terms-of-service", AboutController.httpGetTOS);

export default aboutRouter;

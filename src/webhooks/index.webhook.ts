import express, { Router } from "express";
import { stripeWebhook } from "./stripe.webhook";

const webhookRouter = Router();

webhookRouter.post(
  "/stripe",
  express.raw({ type: "application/json" }),
  stripeWebhook
);

export default webhookRouter;

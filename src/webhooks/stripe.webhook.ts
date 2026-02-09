import { Request, Response } from "express";
import stripe from "../config/stripe";
import logger from "../config/logger";

import { STRIPE_WEBHOOK_SECRET } from "../config/environment";

export const stripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    logger.error(`Stripe webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  logger.info(`Stripe webhook received: ${event.type}`, { eventId: event.id });

  try {
    switch (event.type) {
      case "checkout.session.completed":
        // TODO: Implement checkout session completion handler
        // This should update order status, send confirmation emails, etc.
        logger.warn(`Unimplemented webhook handler: checkout.session.completed`, {
          eventId: event.id,
          sessionId: (event.data.object as any).id,
        });
        break;

      case "invoice.payment_succeeded":
        // TODO: Implement invoice payment success handler
        // This should update subscription status, send receipts, etc.
        logger.warn(`Unimplemented webhook handler: invoice.payment_succeeded`, {
          eventId: event.id,
          invoiceId: (event.data.object as any).id,
        });
        break;

      case "customer.subscription.deleted":
        // TODO: Implement subscription deletion handler
        // This should revoke access, update user status, etc.
        logger.warn(`Unimplemented webhook handler: customer.subscription.deleted`, {
          eventId: event.id,
          subscriptionId: (event.data.object as any).id,
        });
        break;

      case "payment_intent.succeeded":
        logger.info(`Payment intent succeeded`, {
          eventId: event.id,
          paymentIntentId: (event.data.object as any).id,
        });
        break;

      case "payment_intent.payment_failed":
        logger.error(`Payment intent failed`, {
          eventId: event.id,
          paymentIntentId: (event.data.object as any).id,
          error: (event.data.object as any).last_payment_error?.message,
        });
        break;

      default:
        logger.info(`Unhandled Stripe event type: ${event.type}`, { eventId: event.id });
    }

    res.status(200).json({ received: true });
  } catch (handlerError: any) {
    logger.error(`Error processing Stripe webhook: ${handlerError.message}`, {
      eventId: event.id,
      eventType: event.type,
      error: handlerError,
    });
    // Return 500 so Stripe will retry
    res.status(500).json({ error: "Webhook handler failed" });
  }
};

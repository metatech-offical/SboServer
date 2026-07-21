import { Request, Response } from "express";
import Stripe from "stripe";
import stripe from "../config/stripe";
import logger from "../config/logger";
import { STRIPE_WEBHOOK_SECRET } from "../config/environment";
import { OrderService } from "../services";

export const stripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    logger.error(
      `Stripe webhook signature verification failed: ${err.message}`
    );
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  logger.info(`Stripe webhook received: ${event.type}`, { eventId: event.id });

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await OrderService.markOrderPaidByPaymentIntent(
          paymentIntent.id,
          paymentIntent.metadata as Record<string, string>
        );
        logger.info(`Order marked paid`, {
          eventId: event.id,
          paymentIntentId: paymentIntent.id,
          orderId: paymentIntent.metadata?.orderId,
        });
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await OrderService.markOrderPaymentFailed(paymentIntent.id);
        logger.error(`Payment intent failed`, {
          eventId: event.id,
          paymentIntentId: paymentIntent.id,
          error: paymentIntent.last_payment_error?.message,
        });
        break;
      }

      case "checkout.session.completed":
        logger.info(`Checkout session completed (unused for app Payment Sheet)`, {
          eventId: event.id,
          sessionId: (event.data.object as Stripe.Checkout.Session).id,
        });
        break;

      case "invoice.payment_succeeded":
        logger.info(`Invoice payment succeeded (subscriptions not wired yet)`, {
          eventId: event.id,
          invoiceId: (event.data.object as Stripe.Invoice).id,
        });
        break;

      case "customer.subscription.deleted":
        logger.info(`Subscription deleted (not wired yet)`, {
          eventId: event.id,
          subscriptionId: (event.data.object as Stripe.Subscription).id,
        });
        break;

      default:
        logger.info(`Unhandled Stripe event type: ${event.type}`, {
          eventId: event.id,
        });
    }

    res.status(200).json({ received: true });
  } catch (handlerError: any) {
    logger.error(`Error processing Stripe webhook: ${handlerError.message}`, {
      eventId: event.id,
      eventType: event.type,
      error: handlerError,
    });
    res.status(500).json({ error: "Webhook handler failed" });
  }
};

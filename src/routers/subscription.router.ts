import { Router } from "express";
import authenticate from "../middlewares/authenticate";
import { validator } from "../middlewares/validator";
import { isCreator } from "../middlewares/creator.middleware";
import {
  addPlanValidator,
  getCreatorPlansValidator,
  getSubscribedCreatorsQuery,
  planIdValidator,
  subscribeValidator,
  unsubscribeValidator,
  updatePlanValidator,
} from "../validators/subscription.validator";
import { SubscriptionController } from "../controllers";

const subscriptionRouter = Router();
subscriptionRouter.use(authenticate);

subscriptionRouter.post(
  "/add-plan",
  isCreator,
  validator.body(addPlanValidator),
  SubscriptionController.httpAddPlan
);

subscriptionRouter.get(
  "/plans/:creatorId",
  validator.params(getCreatorPlansValidator.params),
  SubscriptionController.httpGetCreatorPlans
);

// Below API gives list of creators whom logged in user has subscribed
subscriptionRouter.get(
  "/my-subscribed-creators",
  validator.query(getSubscribedCreatorsQuery),
  SubscriptionController.httpGetSubscribedCreators
);

// Below API gives list of users who subscribed this creator
subscriptionRouter.get(
  "/subscribers-list",
  isCreator,
  validator.query(getSubscribedCreatorsQuery),
  SubscriptionController.httpGetSubscribers
);

subscriptionRouter.post(
  "/subscribe",
  validator.body(subscribeValidator),
  SubscriptionController.httpSubscribe
);

subscriptionRouter.post(
  "/unsubscribe",
  validator.body(unsubscribeValidator),
  SubscriptionController.httpUnsubscribe
);

subscriptionRouter.put(
  "/update-plan/:planId",
  isCreator,
  validator.body(updatePlanValidator),
  validator.params(planIdValidator),
  SubscriptionController.httpUpdatePlan
);

subscriptionRouter.delete(
  "/delete-plan/:planId",
  isCreator,
  validator.params(planIdValidator),
  SubscriptionController.httpDeletePlan
);

export default subscriptionRouter;

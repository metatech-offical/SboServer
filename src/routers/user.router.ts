import { Router } from "express";
import authenticate from "../middlewares/authenticate";
import { validator } from "../middlewares/validator";
import {
  blockUserValidator,
  followUserValidator,
  userIdValidator,
  userMembershipValidator,
  favoriteCreatorsValidator,
  deleteUserValidator,
  userNotificationSettingsValidator,
  creatorProfileSettingsValidator,
  updatePostSettingsValidator,
  userProfileQueryValidator,
  followersListValidator,
  followingListValidator,
  createUserAddressSchema,
  addressIdParamSchema,
  updateUserAddressSchema,
  getSuggestedAccountsValidator,
} from "../validators/user.validator";
import { UserAddressController, UserController } from "../controllers";
import { isCreator } from "../middlewares/creator.middleware";
import upload from "../middlewares/upload";

const userRouter = Router();

userRouter.use(authenticate);

userRouter.get("/profile", UserController.httpGetCurrentUserProfile);

userRouter.get(
  "/data/:userId",
  validator.params(userIdValidator),
  UserController.httpGetUserById
);

userRouter.get(
  "/suggested-accounts",
  validator.query(getSuggestedAccountsValidator),
  UserController.httpGetSuggestedAccounts
);

userRouter.get(
  "/profile-content/:userId",
  validator.params(userIdValidator),
  validator.query(userProfileQueryValidator),
  UserController.httpGetProfileContentByUserId
);

// Get favorite creators based on viewership
userRouter.get(
  "/favorite-creators",
  validator.query(favoriteCreatorsValidator),
  UserController.httpGetFavoriteCreators
);

userRouter.get("/blocked-users", UserController.httpGetBlockedUsers);

userRouter.get(
  "/followers/",
  validator.query(followersListValidator),
  UserController.httpGetFollowersList
);

userRouter.get(
  "/following/",
  validator.query(followingListValidator),
  UserController.httpGetFollowingList
);

userRouter.post(
  "/block",
  validator.body(blockUserValidator),
  UserController.httpBlockOrUnblockUser
);

userRouter.post(
  "/follow",
  validator.body(followUserValidator),
  UserController.httpFollowUnfollowUser
);

userRouter.patch(
  "/membership",
  validator.body(userMembershipValidator),
  UserController.httpUpdateUserMembership
);

userRouter.put(
  "/notification-settings",
  validator.body(userNotificationSettingsValidator),
  UserController.httpUpdateUserNotificationSettings
);

userRouter.put(
  "/creator-settings",
  isCreator,
  upload.single("file"),
  validator.body(creatorProfileSettingsValidator),
  UserController.httpUpdateCreatorProfile
);

userRouter.delete(
  "/",
  validator.body(deleteUserValidator),
  UserController.httpDeleteAccount
);

userRouter.post(
  "/addresses",
  validator.body(createUserAddressSchema.body),
  UserAddressController.createAddress
);

userRouter.get("/addresses", UserAddressController.getAddresses);

userRouter.get(
  "/addresses/:addressId",
  validator.params(addressIdParamSchema.params),
  UserAddressController.getAddressById
);

userRouter.put(
  "/addresses/:addressId",
  validator.body(updateUserAddressSchema.body),
  validator.params(updateUserAddressSchema.params),
  UserAddressController.updateAddress
);

userRouter.delete(
  "/addresses/:addressId",
  validator.params(addressIdParamSchema.params),
  UserAddressController.deleteAddress
);

userRouter.get("/statistics", UserController.httpGetUserStatistics);
export default userRouter;

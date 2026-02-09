import bcrypt from "bcrypt";
import mongoose, { Schema } from "mongoose";
import { IUser, MembershipLevel, UserStatus } from "./user.type";
import { EUserProvider } from "../../types/enum";
import { collectionNames } from "../../constants/collectionNames";
import { UserDefaultNotifications } from "../notification/notification.types";

const deleteReasonSchema = new Schema(
  {
    category: { type: String, required: true },
    reason: { type: String, required: true },
    deletedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false }
);

const notificationSettingsSchema = new Schema(
  {
    comment: { type: Boolean, default: true },
    like: { type: Boolean, default: true },
    live: { type: Boolean, default: true },
    post: { type: Boolean, default: true },
  },
  { _id: false }
);

const userSchema = new Schema<IUser>({
  username: { type: String, required: false, sparse: true },
  email: { type: String, required: false, sparse: true },
  phoneNumber: { type: String, required: false, sparse: true },
  displayName: { type: String },
  bio: { type: String },
  profilePicture: { type: String },
  password: { type: String, required: false },
  provider: {
    type: {
      provider: {
        type: String,
        enum: EUserProvider,
      },
      id: { type: String, required: false, sparse: true },
    },
    default: null,
  },
  verified: { type: Boolean, required: true, default: false },
  isDeleted: { type: Boolean, required: true, default: false },
  status: {
    type: String,
    enum: Object.values(UserStatus),
    default: UserStatus.ACTIVE,
  },
  deletedReason: { type: [deleteReasonSchema], default: [] },
  membership: {
    type: String,
    enum: Object.values(MembershipLevel),
    default: MembershipLevel.STANDARD,
  },
  notificationSettings: {
    type: notificationSettingsSchema,
    default: UserDefaultNotifications,
  },
  platformSubscription: {
    type: {
      plan: {
        type: Schema.Types.ObjectId,
        ref: "SubscriptionPlan",
        required: true,
      },
      status: { type: String, enum: ["active", "expired"], required: true },
    },
    default: null,
  },
  creatorSubscriptions: [{ type: Schema.Types.Mixed }],
  lastLogin: { type: Date },
  sharesCount: { type: Number, default: 0 },
}, {
  timestamps: true,
});

// Compound indexes for soft deletion uniqueness
userSchema.index(
  { username: 1, isDeleted: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { isDeleted: false },
  }
);

userSchema.index(
  { email: 1, isDeleted: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { isDeleted: false },
  }
);

userSchema.index(
  { phoneNumber: 1, isDeleted: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { isDeleted: false },
  }
);

// Provider ID should also be unique for non-deleted users
userSchema.index(
  { "provider.id": 1, isDeleted: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { isDeleted: false },
  }
);

userSchema.pre("save", async function (next) {
  const user = this;

  try {
    if (!user.isModified("password")) return next();
    // Skip if already hashed
    if ((user as any).isPasswordHashed) {
      return next();
    }

    const hash = await bcrypt.hash(user.password ?? "", 13);
    user.password = hash;
    next();
  } catch (error: any) {
    next(error);
  }
});

userSchema.methods.verifyPassword = async function (password: string) {
  try {
    const result = await bcrypt.compare(password, this.password);
    return result;
  } catch (error) {
    return false;
  }
};

const UserModel = mongoose.model<IUser>(collectionNames.USER, userSchema);
export default UserModel;

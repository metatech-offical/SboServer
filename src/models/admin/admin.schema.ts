import bcrypt from "bcrypt";
import mongoose, { Schema } from "mongoose";
import { IAdmin, AdminRole, AdminStatus } from "./admin.types";

const adminSchema = new Schema<IAdmin>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    role: {
      type: String,
      enum: Object.values(AdminRole),
      default: AdminRole.ADMIN,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(AdminStatus),
      default: AdminStatus.ACTIVE,
      required: true,
    },
    phoneNumber: {
      type: String,
      sparse: true,
    },
    avatar: {
      type: String,
    },
    lastLogin: {
      type: Date,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
    },
  },
  {
    timestamps: true,
  }
);

// Index for email lookups
adminSchema.index({ email: 1 });
adminSchema.index({ status: 1 });
adminSchema.index({ role: 1 });

// Hash password before saving
adminSchema.pre("save", async function (next) {
  const admin = this;

  try {
    if (!admin.isModified("password")) return next();

    // Skip if already hashed
    if ((admin as any).isPasswordHashed) {
      return next();
    }

    const hash = await bcrypt.hash(admin.password, 13);
    admin.password = hash;
    next();
  } catch (error: any) {
    next(error);
  }
});

// Method to verify password
adminSchema.methods.verifyPassword = async function (password: string): Promise<boolean> {
  try {
    const result = await bcrypt.compare(password, this.password);
    return result;
  } catch (error) {
    return false;
  }
};

const AdminModel = mongoose.model<IAdmin>("Admin", adminSchema);
export default AdminModel;

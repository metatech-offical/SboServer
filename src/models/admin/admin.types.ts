import type { Document, Types } from "mongoose";

export enum AdminRole {
  SUPER_ADMIN = "super_admin",
  ADMIN = "admin",
  MODERATOR = "moderator",
}

export enum AdminStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SUSPENDED = "suspended",
}

export interface IAdmin extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: AdminRole;
  status: AdminStatus;
  phoneNumber?: string;
  avatar?: string;
  lastLogin?: Date;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  verifyPassword: (password: string) => Promise<boolean>;
}

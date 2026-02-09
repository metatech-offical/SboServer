import type { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload, VerifyErrors } from "jsonwebtoken";
import { JWT_SECRET } from "../config/environment";
import * as AdminService from "../services/adminService/admin.service";
import { AdminRole } from "../models/admin/admin.types";

/**
 * Middleware to authenticate admin users
 */
export const authenticateAdmin = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized - No token provided",
    });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized - Invalid token format",
    });
  }

  jwt.verify(token, JWT_SECRET, async (err: VerifyErrors | null, decoded: JwtPayload | string | undefined) => {
    if (err) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - Invalid or expired token",
      });
    }

    if (!decoded || typeof decoded === "string" || !decoded.email) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - Invalid token payload",
      });
    }

    const admin = await AdminService.getAdminByEmail(decoded.email);

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - Admin not found",
      });
    }

    (req as any).admin = admin;
    next();
  });
};

/**
 * Middleware to check if admin is super admin
 */
export const isSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  const admin = (req as any).admin;

  if (!admin) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  if (admin.role !== AdminRole.SUPER_ADMIN) {
    return res.status(403).json({
      success: false,
      message: "Forbidden - Super admin access required",
    });
  }

  next();
};

/**
 * Middleware to check if admin has admin role or above
 */
export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  const admin = (req as any).admin;

  if (!admin) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  if (admin.role !== AdminRole.SUPER_ADMIN && admin.role !== AdminRole.ADMIN) {
    return res.status(403).json({
      success: false,
      message: "Forbidden - Admin access required",
    });
  }

  next();
};

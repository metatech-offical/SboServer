import type { Request, Response } from "express";
import { STATUS_CODES } from "../../constants/statusCodes";
import {
  ErrorResponse,
  SuccessResponse,
  UnauthorizedErrorResponse,
  printError,
} from "../../utils/responseHandler";
import * as AdminService from "../../services/adminService/admin.service";
import { AdminRole, AdminStatus } from "../../models/admin/admin.types";

/**
 * Admin login
 * POST /api/v1/admin/auth/login
 */
export const httpAdminLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const result = await AdminService.loginAdmin(email, password);

    if (!result.success) {
      return res.status(result.statusCode).json({
        success: result.success,
        message: result.message,
      });
    }

    return SuccessResponse(
      res,
      result.statusCode,
      result.success,
      result.message,
      result.data
    );
  } catch (error) {
    printError(error, "httpAdminLogin");
    return ErrorResponse(res);
  }
};

/**
 * Get current admin profile
 * GET /api/v1/admin/auth/me
 */
export const httpGetAdminProfile = async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).admin?._id;

    if (!adminId) {
      return UnauthorizedErrorResponse(res);
    }

    const admin = await AdminService.getAdminById(adminId);

    if (!admin) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: "Admin not found",
      });
    }

    return SuccessResponse(
      res,
      STATUS_CODES.OK,
      true,
      "Admin profile retrieved successfully",
      admin
    );
  } catch (error) {
    printError(error, "httpGetAdminProfile");
    return ErrorResponse(res);
  }
};

/**
 * Create new admin (only super admin or admin can create)
 * POST /api/v1/admin/auth/create
 */
export const httpCreateAdmin = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, phoneNumber } = req.body;
    const createdBy = (req as any).admin?._id;

    const result = await AdminService.createAdmin(
      {
        name,
        email,
        password,
        role: role || AdminRole.ADMIN,
        phoneNumber,
      },
      createdBy
    );

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    printError(error, "httpCreateAdmin");
    return ErrorResponse(res);
  }
};

/**
 * Update admin profile
 * PUT /api/v1/admin/auth/profile
 */
export const httpUpdateAdminProfile = async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).admin?._id;
    const { name, phoneNumber, avatar } = req.body;

    const result = await AdminService.updateAdmin(adminId, {
      name,
      phoneNumber,
      avatar,
    });

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    printError(error, "httpUpdateAdminProfile");
    return ErrorResponse(res);
  }
};

/**
 * Update admin status (only super admin)
 * PUT /api/v1/admin/auth/:adminId/status
 */
export const httpUpdateAdminStatus = async (req: Request, res: Response) => {
  try {
    const { adminId } = req.params;
    const { status } = req.body;

    const result = await AdminService.updateAdminStatus(adminId, status);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    printError(error, "httpUpdateAdminStatus");
    return ErrorResponse(res);
  }
};

/**
 * Update admin role (only super admin)
 * PUT /api/v1/admin/auth/:adminId/role
 */
export const httpUpdateAdminRole = async (req: Request, res: Response) => {
  try {
    const { adminId } = req.params;
    const { role } = req.body;

    const result = await AdminService.updateAdminRole(adminId, role);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    printError(error, "httpUpdateAdminRole");
    return ErrorResponse(res);
  }
};

/**
 * Get all admins (only super admin)
 * GET /api/v1/admin/auth/admins
 */
export const httpGetAllAdmins = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as AdminStatus | undefined;
    const role = req.query.role as AdminRole | undefined;

    const result = await AdminService.getAllAdmins(page, limit, { status, role });

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    printError(error, "httpGetAllAdmins");
    return ErrorResponse(res);
  }
};

/**
 * Delete admin (only super admin)
 * DELETE /api/v1/admin/auth/:adminId
 */
export const httpDeleteAdmin = async (req: Request, res: Response) => {
  try {
    const { adminId } = req.params;

    const result = await AdminService.deleteAdmin(adminId);

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
    });
  } catch (error) {
    printError(error, "httpDeleteAdmin");
    return ErrorResponse(res);
  }
};

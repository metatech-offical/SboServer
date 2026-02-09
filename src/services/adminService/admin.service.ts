import { STATUS_CODES } from "../../constants/statusCodes";
import AdminModel from "../../models/admin/admin.schema";
import { IAdmin, AdminRole, AdminStatus } from "../../models/admin/admin.types";
import { ApiResponse, printError } from "../../utils/responseHandler";
import { MESSAGES } from "../../constants/responseMessage";
import { generateJwtToken } from "../../utils/jwtHelper";
import { JWT_TOKEN_EXPIRY } from "../../constants/auth";

/**
 * Get admin by email
 */
export const getAdminByEmail = async (email: string): Promise<IAdmin | null> => {
  try {
    return await AdminModel.findOne({ email });
  } catch (error) {
    printError(error, "getAdminByEmail");
    return null;
  }
};

/**
 * Get admin by ID
 */
export const getAdminById = async (id: string): Promise<IAdmin | null> => {
  try {
    return await AdminModel.findById(id).select("-password");
  } catch (error) {
    printError(error, "getAdminById");
    return null;
  }
};

/**
 * Create a new admin (can only be done by super admin or existing admin)
 */
export const createAdmin = async (
  adminData: Partial<IAdmin>,
  createdBy?: string
): Promise<ApiResponse<IAdmin>> => {
  try {
    // Check if email already exists
    const existingAdmin = await getAdminByEmail(adminData.email!);
    if (existingAdmin) {
      return {
        success: false,
        message: "Email already exists",
        statusCode: STATUS_CODES.BAD_REQUEST,
        data: null,
      };
    }

    const newAdmin = await AdminModel.create({
      ...adminData,
      createdBy,
    });

    const adminWithoutPassword = await AdminModel.findById(newAdmin._id).select("-password");

    return {
      success: true,
      message: "Admin created successfully",
      statusCode: STATUS_CODES.CREATED,
      data: adminWithoutPassword,
    };
  } catch (error) {
    printError(error, "createAdmin");
    return {
      success: false,
      message: MESSAGES.INTERNAL_SERVER_ERROR,
      statusCode: STATUS_CODES.INTERNAL_SERVER_ERROR,
      data: null,
    };
  }
};

/**
 * Admin login with email and password
 */
export const loginAdmin = async (
  email: string,
  password: string
): Promise<ApiResponse<{ admin: IAdmin; token: string }>> => {
  try {
    const admin = await AdminModel.findOne({ email });

    if (!admin) {
      return {
        success: false,
        message: "Invalid email or password",
        statusCode: STATUS_CODES.UNAUTHORIZED,
        data: null,
      };
    }

    // Check if account is active
    if (admin.status !== AdminStatus.ACTIVE) {
      return {
        success: false,
        message: `Account is ${admin.status}. Please contact super admin.`,
        statusCode: STATUS_CODES.UNAUTHORIZED,
        data: null,
      };
    }

    // Verify password
    const isPasswordValid = await admin.verifyPassword(password);
    if (!isPasswordValid) {
      return {
        success: false,
        message: "Invalid email or password",
        statusCode: STATUS_CODES.UNAUTHORIZED,
        data: null,
      };
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    // Generate JWT token
    const token = generateJwtToken(
      { email: admin.email, role: admin.role },
      JWT_TOKEN_EXPIRY
    );

    // Remove password from response
    const adminResponse: any = admin.toObject();
    delete adminResponse.password;

    return {
      success: true,
      message: "Login successful",
      statusCode: STATUS_CODES.OK,
      data: { admin: adminResponse as IAdmin, token },
    };
  } catch (error) {
    printError(error, "loginAdmin");
    return {
      success: false,
      message: MESSAGES.INTERNAL_SERVER_ERROR,
      statusCode: STATUS_CODES.INTERNAL_SERVER_ERROR,
      data: null,
    };
  }
};

/**
 * Update admin profile
 */
export const updateAdmin = async (
  adminId: string,
  updateData: Partial<IAdmin>
): Promise<ApiResponse<IAdmin>> => {
  try {
    // Don't allow updating certain fields through this method
    const { password, role, email, ...allowedUpdates } = updateData;

    const admin = await AdminModel.findByIdAndUpdate(
      adminId,
      allowedUpdates,
      { new: true }
    ).select("-password");

    if (!admin) {
      return {
        success: false,
        message: "Admin not found",
        statusCode: STATUS_CODES.NOT_FOUND,
        data: null,
      };
    }

    return {
      success: true,
      message: "Admin updated successfully",
      statusCode: STATUS_CODES.OK,
      data: admin,
    };
  } catch (error) {
    printError(error, "updateAdmin");
    return {
      success: false,
      message: MESSAGES.INTERNAL_SERVER_ERROR,
      statusCode: STATUS_CODES.INTERNAL_SERVER_ERROR,
      data: null,
    };
  }
};

/**
 * Update admin status (only super admin can do this)
 */
export const updateAdminStatus = async (
  adminId: string,
  status: AdminStatus
): Promise<ApiResponse<IAdmin>> => {
  try {
    const admin = await AdminModel.findByIdAndUpdate(
      adminId,
      { status },
      { new: true }
    ).select("-password");

    if (!admin) {
      return {
        success: false,
        message: "Admin not found",
        statusCode: STATUS_CODES.NOT_FOUND,
        data: null,
      };
    }

    return {
      success: true,
      message: "Admin status updated successfully",
      statusCode: STATUS_CODES.OK,
      data: admin,
    };
  } catch (error) {
    printError(error, "updateAdminStatus");
    return {
      success: false,
      message: MESSAGES.INTERNAL_SERVER_ERROR,
      statusCode: STATUS_CODES.INTERNAL_SERVER_ERROR,
      data: null,
    };
  }
};

/**
 * Update admin role (only super admin can do this)
 */
export const updateAdminRole = async (
  adminId: string,
  role: AdminRole
): Promise<ApiResponse<IAdmin>> => {
  try {
    const admin = await AdminModel.findByIdAndUpdate(
      adminId,
      { role },
      { new: true }
    ).select("-password");

    if (!admin) {
      return {
        success: false,
        message: "Admin not found",
        statusCode: STATUS_CODES.NOT_FOUND,
        data: null,
      };
    }

    return {
      success: true,
      message: "Admin role updated successfully",
      statusCode: STATUS_CODES.OK,
      data: admin,
    };
  } catch (error) {
    printError(error, "updateAdminRole");
    return {
      success: false,
      message: MESSAGES.INTERNAL_SERVER_ERROR,
      statusCode: STATUS_CODES.INTERNAL_SERVER_ERROR,
      data: null,
    };
  }
};

/**
 * Get all admins (with pagination)
 */
export const getAllAdmins = async (
  page: number = 1,
  limit: number = 10,
  filters?: { status?: AdminStatus; role?: AdminRole }
): Promise<ApiResponse<{ admins: IAdmin[]; total: number; page: number; totalPages: number }>> => {
  try {
    const query: any = {};
    if (filters?.status) query.status = filters.status;
    if (filters?.role) query.role = filters.role;

    const skip = (page - 1) * limit;
    const [admins, total] = await Promise.all([
      AdminModel.find(query)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      AdminModel.countDocuments(query),
    ]);

    return {
      success: true,
      message: "Admins retrieved successfully",
      statusCode: STATUS_CODES.OK,
      data: {
        admins,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    printError(error, "getAllAdmins");
    return {
      success: false,
      message: MESSAGES.INTERNAL_SERVER_ERROR,
      statusCode: STATUS_CODES.INTERNAL_SERVER_ERROR,
      data: null,
    };
  }
};

/**
 * Delete admin (only super admin can do this)
 */
export const deleteAdmin = async (adminId: string): Promise<ApiResponse<null>> => {
  try {
    const admin = await AdminModel.findByIdAndDelete(adminId);

    if (!admin) {
      return {
        success: false,
        message: "Admin not found",
        statusCode: STATUS_CODES.NOT_FOUND,
        data: null,
      };
    }

    return {
      success: true,
      message: "Admin deleted successfully",
      statusCode: STATUS_CODES.OK,
      data: null,
    };
  } catch (error) {
    printError(error, "deleteAdmin");
    return {
      success: false,
      message: MESSAGES.INTERNAL_SERVER_ERROR,
      statusCode: STATUS_CODES.INTERNAL_SERVER_ERROR,
      data: null,
    };
  }
};

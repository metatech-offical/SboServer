import { UserFollowService } from "..";
import { STATUS_CODES } from "../../constants/statusCodes";
import UserBlockModel from "../../models/user/userBlock.schema";
import { IPagination } from "../../types/schema";
import { ApiResponse, ResultDB } from "../../utils/responseHandler";

export const blockOrUnblockUser = async (
  blockerId: string,
  blockedId: string,
  action: "block" | "unblock"
) => {
  if (blockerId === blockedId) {
    return ResultDB(
      STATUS_CODES.BAD_REQUEST,
      false,
      "You cannot block or unblock yourself",
      null
    );
  }

  let data;
  if (action === "block") {
    // remove from followers and following
    await UserFollowService.removeUserFromFollowerFollowing(
      blockerId,
      blockedId
    );
    const alreadyBlocked = await UserBlockModel.findOne({
      blocker: blockerId,
      blocked: blockedId,
    });
    if (alreadyBlocked) {
      return ResultDB(STATUS_CODES.OK, false, "User is already blocked", null);
    }

    data = await UserBlockModel.create({
      blocker: blockerId,
      blocked: blockedId,
    });
  } else {
    data = await UserBlockModel.deleteOne({
      blocker: blockerId,
      blocked: blockedId,
    });
  }

  return ResultDB(
    STATUS_CODES.OK,
    true,
    `User ${action}ed successfully"`,
    data
  );
};

export const getBlockedUsers = async (
  userId: string,
  limit: number,
  page: number
): Promise<ApiResponse<{ data: any[]; pagination: IPagination }>> => {
  const skip = (page - 1) * limit;
  const blockedUsers = await UserBlockModel.find({ blocker: userId })
    .skip(skip)
    .limit(limit)
    .populate("blocked", "username profilePicture displayName");

  const totalCount = await UserBlockModel.countDocuments({ blocker: userId });

  return ResultDB(STATUS_CODES.OK, true, "Blocked users fetched successfully", {
    data: blockedUsers,
    pagination: {
      limit,
      currentPage: page,
      totalRecords: totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  });
};


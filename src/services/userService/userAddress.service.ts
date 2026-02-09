import { ResultDB } from "../../utils/responseHandler";
import { USER_ADDRESS_MESSAGES } from "../../constants/responseMessage";
import { STATUS_CODES } from "../../constants/statusCodes";
import UserAddressModel from "../../models/user/userAddress.schema";

const UserAddressService = {
  async createAddress(payload: any) {
    const address = await UserAddressModel.create(payload);
    return ResultDB(
      STATUS_CODES.CREATED,
      true,
      USER_ADDRESS_MESSAGES.CREATED,
      address
    );
  },
  async getAddresses(userId: string) {
    const addresses = await UserAddressModel.find({ userId })
      .sort({ createdAt: -1 })
      .lean();
    return ResultDB(
      STATUS_CODES.OK,
      true,
      USER_ADDRESS_MESSAGES.FETCHED,
      addresses
    );
  },
  async getAddressById(userId: string, addressId: string) {
    const address = await UserAddressModel.findOne({
      userId,
      _id: addressId,
    }).lean();

    if (!address) {
      return ResultDB(
        STATUS_CODES.NOT_FOUND,
        false,
        USER_ADDRESS_MESSAGES.NOT_FOUND
      );
    }

    return ResultDB(
      STATUS_CODES.OK,
      true,
      USER_ADDRESS_MESSAGES.FETCH_ONE,
      address
    );
  },
  async updateAddress(userId: string, addressId: string, payload: any) {
    const address = await UserAddressModel.findOneAndUpdate(
      { userId, _id: addressId },
      { $set: payload },
      { new: true }
    ).lean();
    return ResultDB(
      STATUS_CODES.OK,
      !!address,
      USER_ADDRESS_MESSAGES.UPDATED,
      address
    );
  },
  async deleteAddress(userId: string, addressId: string) {
    const address = await UserAddressModel.findOneAndDelete({
      userId,
      _id: addressId,
    }).lean();
    return ResultDB(
      STATUS_CODES.OK,
      !!address,
      USER_ADDRESS_MESSAGES.DELETED,
      address
    );
  },
};

export default UserAddressService;

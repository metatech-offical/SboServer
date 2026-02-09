import { EContentType } from "../../constants/collectionNames";
import ViewModel from "../../models/contentActions/view.schema";
import { printError } from "../../utils/responseHandler";

export const userWatchStats = async (userId: string) => {
  try {
    const types = [EContentType.SHORT, EContentType.STREAM];

    const totalWatchedVideos = await ViewModel.distinct("contentId", {
      userId,
      contentType: { $in: types },
    });
    return totalWatchedVideos.length || 0;
  } catch (error) {
    console.log(error);
    printError(error);
    return 0;
  }
};

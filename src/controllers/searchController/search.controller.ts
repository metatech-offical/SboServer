import { Request, Response } from "express";
import {
  ErrorResponse,
  printError,
  SuccessOKResponse,
  UnauthorizedErrorResponse,
} from "../../utils/responseHandler";
import {
  KeywordService,
  ShortsService,
  StreamService,
  UserService,
} from "../../services";
import { AuthenticatedRequest } from "../../types/express";

export const httpSearch = async (req: Request, res: Response) => {
  const page = Number((req.query.page as string) ?? 1);
  const limit = Number((req.query.limit as string) ?? 10);
  const keyword = req.query.keyword as string;
  if (keyword.trim() === "") {
    return SuccessOKResponse(res, {
      users: [],
      streams: [],
      shorts: [],
    });
  }

  const userId = (req as AuthenticatedRequest).user._id.toString();

  try {
    // Use Promise.allSettled to handle individual failures
    const [usersResult, streamsResult, shortsResult] = await Promise.allSettled(
      [
        UserService.getSearchedUsers(keyword, page, limit),
        StreamService.getSearchedStreams(keyword, userId, page, limit),
        ShortsService.getSearchedShorts(keyword, userId, page, limit),
      ]
    );

    // Extract values or provide empty arrays for failed promises
    const users = usersResult.status === "fulfilled" ? usersResult.value : [];
    const streams =
      streamsResult.status === "fulfilled" ? streamsResult.value : [];
    const shorts =
      shortsResult.status === "fulfilled" ? shortsResult.value : [];

    if (usersResult.status === "rejected")
      printError(usersResult.reason, "UserService.getSearchedUsers");
    if (streamsResult.status === "rejected")
      printError(streamsResult.reason, "StreamService.getSearchedStreams");
    if (shortsResult.status === "rejected")
      printError(shortsResult.reason, "ShortsService.getSearchedShorts");

    // Only update search history if at least one search succeeded
    if (
      [usersResult, streamsResult, shortsResult].some(
        (result) => result.status === "fulfilled"
      )
    ) {
      await KeywordService.updateSearchKeywordHistory(keyword, userId).catch(
        (err) => printError(err, "updateSearchKeywordHistory")
      );
    }

    return SuccessOKResponse(res, {
      users,
      streams,
      shorts,
    });
  } catch (error) {
    printError(error, "httpSearch");
    return ErrorResponse(res);
  }
};

/**
 * This function fetches the top 5 trending searches globally
 * and returns the top 5 keywords and the streams that match those keywords
 * (sorted by newest first, limited to 10 streams)
 * @param req
 * @param res
 */
export const httpGetGlobalTrendingSearches = async (
  req: Request,
  res: Response
) => {
  const userId = req.user?._id?.toString();

  if (!userId) {
    return UnauthorizedErrorResponse(res, "User not authenticated");
  }
  try {
    const topKeywords = await KeywordService.getGlobalTrendingKeywords();
    const keywords = topKeywords.map((k) => k._id);

    const matchedStreams = await StreamService.getKeywordsMatchingStreams(
      keywords,
      userId
    );
    const data = {
      keywords,
      streams: matchedStreams,
      recentSearches: await KeywordService.getUserRecentSearches(userId),
    };

    return SuccessOKResponse(res, data);
  } catch (error) {
    printError(error, "httpGetGlobalTrendingSearches");
    return ErrorResponse(res);
  }
};

export const httpDeleteSearchKeyword = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user._id.toString();
    const { keyword } = req.query;
    const result = await KeywordService.deleteSearchKeyword(
      String(keyword),
      userId
    );
    return SuccessOKResponse(res, result);
  } catch (error) {
    printError(error, "httpDeleteSearchKeyword");
    return ErrorResponse(res);
  }
};

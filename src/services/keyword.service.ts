import KeywordModel from "../models/keyword/keyword.schema";

export const updateSearchKeywordHistory = async (
  keyword: string,
  userId: string
) => {
  const existingKeyword = await KeywordModel.findOneAndUpdate(
    { keyword: { $regex: `^${keyword}$`, $options: "i" }, userId },
    { $inc: { count: 1 } },
    { new: true }
  );

  if (!existingKeyword) {
    const keywordCount = await KeywordModel.countDocuments({ userId });
    if (keywordCount < 5) {
      await KeywordModel.create({ keyword, count: 1, userId });
    } else {
      const leastSearched = await KeywordModel.findOne({ userId }).sort(
        "count"
      );
      if (leastSearched) {
        await KeywordModel.findByIdAndDelete(leastSearched._id);
        await KeywordModel.create({ keyword, count: 1, userId });
      }
    }
  }
};

export const getGlobalTrendingKeywords = async () => {
  return KeywordModel.aggregate([
    {
      $group: {
        _id: { $toLower: "$keyword" },
        totalSearches: { $sum: "$count" },
      },
    },
    {
      $sort: { totalSearches: -1 },
    },
    {
      $limit: 5,
    },
  ]);
};

export const getUserRecentSearches = async (userId: string) => {
  return KeywordModel.find({ userId }).sort({ createdAt: -1 }).limit(3);
};

export const deleteSearchKeyword = async (keyword: string, userId: string) => {
  return KeywordModel.findOneAndDelete({ keyword, userId });
};

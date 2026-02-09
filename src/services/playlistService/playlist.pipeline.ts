import { Types } from "mongoose";
import { collectionNames, EContentType } from "../../constants/collectionNames";

export const getPopulatedPlaylistPipeline = (playlistId: string) => {
  const objectId = new Types.ObjectId(playlistId);
  return [
    { $match: { _id: objectId } },
    { $unwind: "$items" },
    {
      $lookup: {
        from: collectionNames.SHORT,
        localField: "items.contentId",
        foreignField: "_id",
        as: "shortContent",
      },
    },
    {
      $lookup: {
        from: collectionNames.STREAM,
        localField: "items.contentId",
        foreignField: "_id",
        as: "streamContent",
      },
    },
    {
      $addFields: {
        "items.content": {
          $cond: [
            { $eq: ["$items.contentType", EContentType.SHORT] },
            { $arrayElemAt: ["$shortContent", 0] },
            { $arrayElemAt: ["$streamContent", 0] },
          ],
        },
      },
    },
    {
      $group: {
        _id: "$_id",
        title: { $first: "$title" },
        description: { $first: "$description" },
        createdBy: { $first: "$createdBy" },
        createdAt: { $first: "$createdAt" },
        items: { $push: "$items" },
      },
    },
  ];
};

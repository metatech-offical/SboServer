import { MESSAGES, STREAM_MESSAGES } from "../../constants/responseMessage";
import { STATUS_CODES } from "../../constants/statusCodes";
import StreamModel from "../../models/stream/stream.schema";
import { IStream } from "../../models/stream/stream.type";
import { printError, ResultDB } from "../../utils/responseHandler";
import { Types } from "mongoose";
import {
  generateZegoToken,
  startZegoCloudRecording,
  stopZegoCloudRecording,
  verifyZegoWebhookSignature,
} from "../../utils/zegocloud.helper";
import {
  APPID,
  AWS_S3_BUCKET_NAME,
  SERVER_SECRET,
  ZEGOCLOUD_CALLBACK_SECRET,
} from "../../config/environment";
import { streamIO, mainIO } from "../../sockets/main";
import LikeModel from "../../models/contentActions/like.schema";
import { EContentType } from "../../constants/collectionNames";
import UserFollowModel from "../../models/user/userFollow.schema";
import {
  IZegoRecordingWebhook,
  ZegoRecordingEventType,
  IWebhookStreamStarted,
} from "../../types/zegoWebhook/zego";

export const createLiveStream = async (
  userId: Types.ObjectId,
  newStreamData: Partial<IStream>
) => {
  try {
    const userIdStr = userId.toString();
    const roomId = `room_${userId.toString()}_${Date.now()}`;

    const token = generateZegoToken({
      appId: APPID,
      serverSecret: SERVER_SECRET,
      userIdStr,
    });
    const newStream = new StreamModel({
      creatorId: userId,
      // Mark live immediately so viewers can discover the stream without
      // waiting for the Zego webhook (often misconfigured / APPID mismatch).
      status: "published",
      type: "video-live",
      isLive: true,
      token,
      roomId,
      ...newStreamData,
    });
    const result = await newStream.save();

    try {
      streamIO?.emit("new_stream", { roomId, result });
      mainIO?.emit("new_stream", { roomId, result });
    } catch (emitErr) {
      console.warn("Failed to emit new_stream:", emitErr);
    }

    return ResultDB(
      STATUS_CODES.CREATED,
      true,
      STREAM_MESSAGES.SUCCESS,
      result
    );
  } catch (error) {
    console.log("Error creating live stream:", error);
    return ResultDB(500, false, MESSAGES.INTERNAL_SERVER_ERROR, null);
  }
};

export const getLiveStreamByUserId = async (userId: string) => {
  try {
    const streams = await StreamModel.find({
      creatorId: new Types.ObjectId(userId),
      isLive: true,
    }).populate("creator", "username displayName profilePicture");

    return ResultDB(STATUS_CODES.OK, true, STREAM_MESSAGES.SUCCESS, streams);
  } catch (error) {
    printError(error, "getLiveStreamByUserId");
    return ResultDB(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      MESSAGES.INTERNAL_SERVER_ERROR,
      null
    );
  }
};

export const getAllLiveStreams = async (
  userId: string,
  page = 1,
  limit = 10
) => {
  try {
    const skip = (page - 1) * limit;

    // 1. Fetch streams with pagination
    const streams = await StreamModel.find({ isDeleted: false, isLive: true })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("creator", "username profilePicture displayName")
      .lean();

    if (!streams.length) {
      return ResultDB(STATUS_CODES.OK, true, MESSAGES.SUCCESS, []);
    }

    // 2. Collect stream IDs and creator IDs
    const streamIds = streams.map((s) => s._id);
    const creatorIds = streams.map((s) => s.creatorId);

    // 3. Fetch likes in ONE query
    const likedDocs = await LikeModel.find({
      userId: new Types.ObjectId(userId),
      contentId: { $in: streamIds },
      contentType: EContentType.STREAM,
    })
      .select("contentId")
      .lean();

    const likedSet = new Set(likedDocs.map((doc) => doc.contentId.toString()));

    // 3. Fetch follows in ONE query
    const followDocs = await UserFollowModel.find({
      followerId: new Types.ObjectId(userId),
      followingId: { $in: creatorIds },
    })
      .select("followingId")
      .lean();
    const creatorSet = new Set(
      followDocs.map((doc) => doc.followingId.toString())
    );

    // 4. Merge `isLiked` and `isFollowing` into results
    const enrichedStreams = streams.map((s) => ({
      ...s,
      isLiked: likedSet.has(s._id.toString()),
      isFollowing: creatorSet.has(s.creatorId.toString()),
    }));

    // 5. Get total count for pagination
    const totalCount = await StreamModel.countDocuments({
      isDeleted: false,
      isLive: true,
    });

    return ResultDB(STATUS_CODES.OK, true, MESSAGES.SUCCESS, {
      totalCount,
      page,
      limit,
      streams: enrichedStreams,
    });
  } catch (error) {
    printError(error, "getAllStreams");
    return ResultDB(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      MESSAGES.INTERNAL_SERVER_ERROR,
      null
    );
  }
};
export const liveStreamStarted = async (payload: IWebhookStreamStarted) => {
  const { room_id, stream_sid, publish_id, user_id, create_time, title } =
    payload;
  try {
    const findStream = await StreamModel.findOne({ roomId: room_id });
    if (!findStream) {
      console.error("Stream not found for roomId:", room_id);
      return ResultDB(STATUS_CODES.NOT_FOUND, false, "Stream not found", null);
    }
    findStream.isLive = true;
    findStream.status = "published";

    const record = (await startZegoCloudRecording({
      roomId: room_id,
      streamId: stream_sid,
    })) as any;
    const taskId = record?.data?.response?.data?.Data?.TaskId;

    if (record.success && taskId) {
      findStream.vodRecordingTaskId = taskId;
      findStream.vodStatus = "processing";
    }

    const result = await findStream.save();
    streamIO?.emit("new_stream", { roomId: room_id, result });
    mainIO?.emit("new_stream", { roomId: room_id, result });

    return ResultDB(
      STATUS_CODES.OK,
      true,
      STREAM_MESSAGES.LIVE_STARTED,
      result
    );
  } catch (error) {
    printError(error, "updateStreamToLive");
    return ResultDB(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      MESSAGES.INTERNAL_SERVER_ERROR,
      null
    );
  }
};

export const liveStreamEnded = async (payload: IWebhookStreamStarted) => {
  const { room_id } = payload;
  try {
    const findStream = await StreamModel.findOne({ roomId: room_id });
    if (!findStream) {
      console.error("Stream not found for roomId:", room_id);
      return ResultDB(
        STATUS_CODES.NOT_FOUND,
        false,
        STREAM_MESSAGES.NOT_FOUND,
        null
      );
    }

    // if (findStream.vodRecordingTaskId) {
    //   const stopRecording = await stopZegoCloudRecording({
    //     taskId: findStream.vodRecordingTaskId,
    //   });
    //   console.log("Stopped Zego Recording:", stopRecording);
    // } else {
    //   console.warn(
    //     "No recordingTaskId found on stream, skipping stop recording."
    //   );
    // }

    findStream.isLive = false;
    findStream.status = "ended";
    findStream.endedAt = new Date();

    const result = await findStream.save();
    streamIO?.emit("new_stream", { roomId: room_id, result });
    mainIO?.emit("new_stream", { roomId: room_id, result });

    return ResultDB(
      STATUS_CODES.OK,
      true,
      STREAM_MESSAGES.LIVE_STARTED,
      result
    );
  } catch (error) {
    printError(error, "updateStreamToLiveEnded");
    return ResultDB(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      MESSAGES.INTERNAL_SERVER_ERROR,
      null
    );
  }
};

/**
 * Handles ZegoCloud recording webhook callbacks
 * Processes different event types and updates stream VOD status
 */
export const handleRecordingWebhook = async (
  payload: IZegoRecordingWebhook
) => {
  const {
    app_id,
    task_id,
    room_id,
    event_type,
    detail,
    signature,
    timestamp,
    nonce,
  } = payload;

  try {
    // 1. Verify webhook signature
    const isValid = verifyZegoWebhookSignature(
      signature,
      timestamp,
      nonce,
      ZEGOCLOUD_CALLBACK_SECRET
    );

    if (!isValid) {
      console.error("Invalid webhook signature from ZegoCloud");
      return ResultDB(
        STATUS_CODES.UNAUTHORIZED,
        false,
        "Invalid signature",
        null
      );
    }

    // 2. Find the stream by task_id or room_id
    let findStream = await StreamModel.findOne({
      $or: [{ vodRecordingTaskId: task_id }, { roomId: room_id }],
    }).populate("creator", "username displayName profilePicture");

    if (!findStream) {
      console.error(
        "Stream not found for task_id:",
        task_id,
        "room_id:",
        room_id
      );
      return ResultDB(STATUS_CODES.NOT_FOUND, false, "Stream not found", null);
    }

    // 3. Handle different event types
    switch (event_type) {
      case ZegoRecordingEventType.FILE_UPLOAD_COMPLETE:
        // Recording file upload completed
        if (
          detail.upload_status === 1 &&
          detail.file_info &&
          detail.file_info.length > 0
        ) {
          const fileInfo = detail.file_info[0];

          // Update stream with VOD details
          findStream.vodStatus = "ready";
          findStream.videoUrl = fileInfo.file_url; // Store video URL for frontend access
          findStream.duration = Math.floor(fileInfo.duration / 1000); // Convert ms to seconds
          findStream.vodMeta = {
            ...findStream.vodMeta,
            fileUrl: fileInfo.file_url, // Also store in vodMeta for easier access
            fileName: fileInfo.file_id,
            duration: fileInfo.duration,
            size: fileInfo.file_size,
            resolution: {
              width: fileInfo.resolution_width,
              height: fileInfo.resolution_height,
            },
            format: fileInfo.output_file_format,
            beginTimestamp: fileInfo.begin_timestamp,
            mediaTrackType: fileInfo.media_track_type,
          };

          await findStream.save();

          // Emit socket event to frontend
          streamIO.emit("vod_ready", {
            streamId: findStream.id.toString(),
            roomId: room_id,
            vodUrl: fileInfo.file_url,
            duration: findStream.duration,
            stream: findStream,
          });

          console.log("✅ VOD ready for stream:", findStream._id, "Video URL:", fileInfo.file_url);
        }
        break;

      case ZegoRecordingEventType.RECORDING_COMPLETED:
        // Recording completed successfully
        // Check if file_info is available in this event (sometimes URL comes here)
        if (detail.file_info && detail.file_info.length > 0) {
          const fileInfo = detail.file_info[0];
          if (fileInfo.file_url) {
            findStream.videoUrl = fileInfo.file_url;
            findStream.vodMeta = {
              ...findStream.vodMeta,
              fileUrl: fileInfo.file_url,
            };
            console.log("📹 Video URL stored from RECORDING_COMPLETED:", fileInfo.file_url);
          }
        }
        
        findStream.vodStatus = "processing";
        await findStream.save();

        streamIO.emit("recording_completed", {
          streamId: findStream.id.toString(),
          roomId: room_id,
          taskId: task_id,
        });

        console.log("✅ Recording completed for stream:", findStream._id);
        break;

      case ZegoRecordingEventType.UPLOADING_FILE:
        // File is being uploaded
        findStream.vodStatus = "processing";
        await findStream.save();

        streamIO.emit("recording_uploading", {
          streamId: findStream.id.toString(),
          roomId: room_id,
          message: "Recording file is being uploaded",
        });

        console.log("📤 Uploading recording for stream:", findStream._id);
        break;

      case ZegoRecordingEventType.TASK_ENDED_ABNORMALLY:
        // Recording task ended abnormally
        findStream.vodStatus = "failed";
        findStream.vodMeta = {
          ...findStream.vodMeta,
          errorCode: detail.error_code,
          errorMessage: detail.error_message || "Recording failed",
        };
        await findStream.save();

        streamIO.emit("recording_failed", {
          streamId: findStream.id.toString(),
          roomId: room_id,
          error: detail.error_message || "Recording failed",
        });

        console.error("❌ Recording failed for stream:", findStream._id);
        break;

      case ZegoRecordingEventType.NO_STREAMS_IN_ROOM:
        // No streams detected in the room
        console.warn("⚠️ No streams in room:", room_id);

        streamIO.emit("no_streams_in_room", {
          streamId: findStream.id.toString(),
          roomId: room_id,
          message: "No active streams detected in room",
        });
        break;

      case ZegoRecordingEventType.STREAM_NOT_EXIST:
        // Stream doesn't exist
        findStream.vodStatus = "failed";
        findStream.vodMeta = {
          ...findStream.vodMeta,
          errorMessage: "Stream not found during recording",
        };
        await findStream.save();

        streamIO.emit("recording_failed", {
          streamId: findStream.id.toString(),
          roomId: room_id,
          error: "Stream not found during recording",
        });

        console.error("❌ Stream not found:", findStream._id);
        break;

      case ZegoRecordingEventType.M3U8_NOTIFICATION:
        // M3U8 file notification for real-time segments
        if (detail.file_info && detail.file_info.length > 0) {
          const m3u8Info = detail.file_info[0];

          findStream.transcodedUrl = m3u8Info.file_url;
          await findStream.save();

          streamIO.emit("m3u8_ready", {
            streamId: findStream.id.toString(),
            roomId: room_id,
            m3u8Url: m3u8Info.file_url,
          });

          console.log("📹 M3U8 URL updated for stream:", findStream._id);
        }
        break;

      case ZegoRecordingEventType.RECORDING_PAUSED:
        console.log("⏸️ Recording paused for stream:", findStream._id);

        streamIO.emit("recording_paused", {
          streamId: findStream.id.toString(),
          roomId: room_id,
        });
        break;

      case ZegoRecordingEventType.RECORDING_RESUMED:
        console.log("▶️ Recording resumed for stream:", findStream._id);

        streamIO.emit("recording_resumed", {
          streamId: findStream.id.toString(),
          roomId: room_id,
        });
        break;

      default:
        console.log("Unknown event_type:", event_type);
    }

    return ResultDB(STATUS_CODES.OK, true, "Webhook processed successfully", {
      streamId: findStream._id,
      eventType: event_type,
    });
  } catch (error) {
    printError(error, "handleRecordingWebhook");
    return ResultDB(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      MESSAGES.INTERNAL_SERVER_ERROR,
      null
    );
  }
};

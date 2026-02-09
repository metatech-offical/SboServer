import jwt from "jsonwebtoken";
import crypto from "crypto";
import { app } from "firebase-admin";
import { POSTAPI } from "./axios";
import {
  APPID,
  AWS_REGION,
  SERVER_SECRET,
  ZEGOCLOUD_DOMAIN,
  ZEGOCLOUD_RECORDING_CALLBACK_URL,
  ZEGOCLOUD_RECORDING_OUTPUT_DIR,
  ZEGOCLOUD_RECORDING_OUTPUT_FORMAT,
  ZEGOCLOUD_S3_ACCESS_KEY_ID,
  ZEGOCLOUD_S3_AWS_REGION,
  ZEGOCLOUD_S3_BUCKET_NAME,
  ZEGOCLOUD_S3_SECRET_ACCESS_KEY,
  ZEGOCLOUD_CALLBACK_SECRET,
} from "../config/environment";
import { printError, ResultDB } from "./responseHandler";
import { STATUS_CODES } from "../constants/statusCodes";

export interface ZegoStartRecordParams {
  roomId: string;
  streamId: string;
  streamDBId?: string; // For saving to your DB if needed
}
export interface ZegoStopRecordParams {
  taskId: string;
}
export interface ZegoS3StorageParams {
  Vendor: number;
  Region: string;
  Bucket: string;
  AccessKeyId: string;
  AccessKeySecret: string;
}

export interface ZegoRecordingResponse {
  success: boolean;
  status: number;
  data: {
    Code: number;
    Message: string;
    RequestId: string;
    Data: {
      TaskId: string;
    };
  };
}
export interface ZegoS3RecordOutputParams {
  OutputFileFormat: string;
  OutputFolder: string;
  OutputFileRule: number;
  SnapshotInterval?: number;
  CallbackUrl?: string;
  FragmentSeconds?: number;
  RealtimeUploadFragment?: boolean; //only when hls
  ShortFragmentPath?: boolean; // only when hld
}

export const generateZegoToken = ({
  appId,
  serverSecret,
  userIdStr,
  effectiveTimeInSeconds = 3600,
}: {
  appId: number;
  serverSecret: string;
  userIdStr: string;
  effectiveTimeInSeconds?: number;
}): string => {
  const payload = {
    app_id: appId,
    user_id: userIdStr,
    nonce: Math.floor(Math.random() * 100000),
    ctime: Math.floor(Date.now() / 1000),
    expire: effectiveTimeInSeconds,
  };

  return jwt.sign(payload, serverSecret, { algorithm: "HS256" });
};

export const generateZegoSignature = (appId: number, serverSecret: string) => {
  const signatureNonce = crypto.randomBytes(8).toString("hex");
  const timestamp = Math.round(Date.now() / 1000);
  const rawString = `${appId}${signatureNonce}${serverSecret}${timestamp}`;
  const signature = crypto.createHash("md5").update(rawString).digest("hex");
  return { signature, signatureNonce, timestamp };
};

export const startZegoCloudRecording = async ({
  roomId,
  streamId,
}: ZegoStartRecordParams) => {
  try {
    // These come from your config/env
    const s3Config: ZegoS3StorageParams = {
      Vendor: 1,
      Region: ZEGOCLOUD_S3_AWS_REGION,
      Bucket: ZEGOCLOUD_S3_BUCKET_NAME,
      AccessKeyId: ZEGOCLOUD_S3_ACCESS_KEY_ID,
      AccessKeySecret: ZEGOCLOUD_S3_SECRET_ACCESS_KEY,
    };

    const recordOutputConfig: ZegoS3RecordOutputParams = {
      OutputFileFormat: ZEGOCLOUD_RECORDING_OUTPUT_FORMAT,
      OutputFolder: ZEGOCLOUD_RECORDING_OUTPUT_DIR,
      OutputFileRule: 1,
      // SnapshotInterval: 10,
      CallbackUrl: ZEGOCLOUD_RECORDING_CALLBACK_URL,
      // FragmentSeconds: 15
      RealtimeUploadFragment: false, //only when hls
      ShortFragmentPath: false, // only when hld
    };

    const payload = {
      Action: "StartRecord",
      RoomId: roomId,
      RecordInputParams: {
        RecordMode: 1, // Single stream recording
        StreamList: [streamId], // Stream to record
      },
      StorageParams: {
        Vendor: s3Config.Vendor, // 3 = AWS S3
        Region: s3Config.Region,
        Bucket: s3Config.Bucket,
        AccessKeyId: s3Config.AccessKeyId,
        AccessKeySecret: s3Config.AccessKeySecret,
      },
      RecordOutputParams: {
        OutputFileFormat: recordOutputConfig.OutputFileFormat,
        OutputFolder: recordOutputConfig.OutputFolder,
        OutputFileRule: recordOutputConfig.OutputFileRule,
        CallbackUrl: recordOutputConfig.CallbackUrl,
      },
    };

    const { signature, signatureNonce, timestamp } = generateZegoSignature(
      Number(APPID),
      SERVER_SECRET
    );
    const postURL =
      `${ZEGOCLOUD_DOMAIN}/?Action=StartRecord` +
      `&AppId=${APPID}` +
      `&SignatureNonce=${signatureNonce}` +
      `&Timestamp=${timestamp}` +
      `&Signature=${signature}` +
      `&SignatureVersion=2.0` +
      `&RegionId=${ZEGOCLOUD_S3_AWS_REGION}`;

    console.log("this is the postURL:>", postURL);
    const response = (await POSTAPI(postURL, payload, {
      headers: { "Content-Type": "application/json" },
    })) as ZegoRecordingResponse;
    // Zego response handling:
    if (response.success) {
      return ResultDB(STATUS_CODES.OK, true, "Recording started", {
        response,
      });
    } else {
      return ResultDB(
        STATUS_CODES.BAD_REQUEST,
        false,
        "Could not start recording",
        null
      );
    }
  } catch (err) {
    printError(err, "startZegoCloudRecording");
    return ResultDB(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      "Error starting recording",
      null
    );
  }
};

export const stopZegoCloudRecording = async ({
  taskId,
}: ZegoStopRecordParams) => {
  try {
    const { signature, signatureNonce, timestamp } = generateZegoSignature(
      Number(APPID),
      SERVER_SECRET
    );

    const postURL =
      `${ZEGOCLOUD_DOMAIN}/?Action=StopRecord` +
      `&AppId=${APPID}` +
      `&SignatureNonce=${signatureNonce}` +
      `&Timestamp=${timestamp}` +
      `&Signature=${signature}` +
      `&SignatureVersion=2.0` +
      `&RegionId=${ZEGOCLOUD_S3_AWS_REGION}`;

    const payload = {
      TaskId: taskId,
    };

    const response = await POSTAPI(postURL, payload, {
      headers: { "Content-Type": "application/json" },
    });
    if (response.data?.Success) {
      return ResultDB(
        STATUS_CODES.OK,
        true,
        "Recording stopped",
        response.data
      );
    }
  } catch (error) {
    printError(error, "stopZegoCloudRecording");
    return ResultDB(
      STATUS_CODES.INTERNAL_SERVER_ERROR,
      false,
      "Error stopping recording",
      null
    );
  }
};

/**
 * Verifies ZegoCloud webhook signature
 * @param signature - Signature from webhook payload
 * @param timestamp - Timestamp from webhook payload
 * @param nonce - Nonce from webhook payload
 * @param callbackSecret - Your callback secret from ZegoCloud console
 * @returns boolean - true if signature is valid
 */
export const verifyZegoWebhookSignature = (
  signature: string,
  timestamp: string,
  nonce: string,
  callbackSecret: string
): boolean => {
  try {
    // Sort the three values: secret, timestamp, nonce
    const tmpArr = [callbackSecret, timestamp, nonce];
    tmpArr.sort();

    // Join them together
    const tmpStr = tmpArr.join("");

    // Calculate SHA1 hash
    const calculatedSignature = crypto
      .createHash("sha1")
      .update(tmpStr)
      .digest("hex");

    // Compare signatures
    return calculatedSignature === signature;
  } catch (error) {
    printError(error, "verifyZegoWebhookSignature");
    return false;
  }
};

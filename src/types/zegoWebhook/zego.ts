export interface IWebhookStreamStarted {
  appid: string;
  channel_id: string;
  create_time: string;
  event: string;
  publish_id: string;
  room_id: string;
  stream_id: string;
  stream_sid: string;
  user_id: string;
  user_name: string;
  title?: string;
  signature?: string;
}

// ZegoCloud Recording Webhook Types
export interface IZegoRecordingWebhook {
  app_id: number;
  task_id: string;
  room_id: string;
  event_type: number;
  message: string;
  nonce: string;
  timestamp: string;
  signature: string;
  sequence: number;
  detail: IZegoRecordingDetail;
}

export interface IZegoRecordingDetail {
  file_info?: IZegoFileInfo[];
  upload_status?: number;
  error_code?: number;
  error_message?: string;
  [key: string]: any;
}

export interface IZegoFileInfo {
  begin_timestamp: number;
  duration: number;
  file_id: string;
  file_size: number;
  file_url: string;
  media_track_type: number;
  output_file_format: string;
  resolution_height: number;
  resolution_width: number;
  status: number;
  stream_id: string;
  user_id: string;
  user_name: string;
  video_id: string;
}

// Event Types
export enum ZegoRecordingEventType {
  FILE_UPLOAD_COMPLETE = 1,
  TASK_ENDED_ABNORMALLY = 2,
  BACKGROUND_DOWNLOAD_FAILED = 3,
  NO_STREAMS_IN_ROOM = 4,
  RECORDING_COMPLETED = 5,
  STREAM_NOT_EXIST = 6,
  UPLOADING_FILE = 7,
  M3U8_NOTIFICATION = 102,
  RECORDING_PAUSED = 201,
  RECORDING_RESUMED = 202,
}
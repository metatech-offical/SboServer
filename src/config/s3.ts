import { S3Client } from "@aws-sdk/client-s3";
import {
  AWS_ACCESS_KEY_ID,
  AWS_REGION,
  AWS_SECRET_ACCESS_KEY,
  AWS_S3_ENDPOINT,
} from "./environment";

const s3Client = new S3Client({
  region: AWS_REGION || "auto",
  ...(AWS_S3_ENDPOINT
    ? {
        endpoint: AWS_S3_ENDPOINT,
        forcePathStyle: true,
      }
    : {}),
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

export default s3Client;

import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

import s3Client from "../config/s3";
import { AWS_REGION, AWS_S3_BUCKET_NAME } from "../config/environment";
import { ReadStream } from "fs";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

interface S3Response {
  success: boolean;
  url?: string;
  key?: string;
  error?: any;
}

export const uploadFileToS3 = async (
  fileContent: Buffer | ReadStream,
  bucketName: string,
  key: string,
  contentType: string
): Promise<S3Response> => {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: fileContent,
    ContentType: contentType,
  });

  try {
    await s3Client.send(command);
    const url = getPublicUrlFromS3(bucketName, key);
    return { success: true, url, key };
  } catch (error) {
    console.error("Error uploading file:", error);
    return { success: false, error };
  }
};

export const deleteFileFromS3 = async (
  bucketName: string,
  key: string
): Promise<S3Response> => {
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  try {
    await s3Client.send(command);
    return { success: true, key };
  } catch (error) {
    console.error("Error deleting file:", error);
    return { success: false, error };
  }
};

export const getPublicUrlFromS3 = (bucketName: string, key: string): string => {
  return `https://s3.${AWS_REGION}.amazonaws.com/${bucketName}/${key}`;
};

export const extractKeyFromPresignedUrl = (
  presignedUrl: string
): string | null => {
  try {
    const url = new URL(presignedUrl);
    // The key is typically after the bucket name in the path
    const pathParts = url.pathname.split("/");
    // Remove the first empty string from split
    pathParts.shift();
    return pathParts.join("/");
  } catch (error) {
    console.error("Error extracting key from URL:", error);
    return null;
  }
};

export const generatePreSignedUrl = async (key: string) => {
  const command = new PutObjectCommand({
    Bucket: AWS_S3_BUCKET_NAME,
    Key: key,
    ContentType: "video/mp4",
  });
  return getSignedUrl(s3Client, command, { expiresIn: 10 * 60 });
};

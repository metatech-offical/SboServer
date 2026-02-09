import { Request, Response } from "express";
import { uploadFileToS3 } from "../lib/s3";
import { AWS_S3_BUCKET_NAME } from "../config/environment";
import { createProblemReport } from "../models/reportProblem/reportProblem.model";
import {
  ErrorResponse,
  printError,
  SuccessOKResponse,
  UnauthorizedErrorResponse,
} from "../utils/responseHandler";
import { STATUS_CODES } from "../constants/statusCodes";

export const httpReportProblem = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    const { category, message } = req.body;

    if (!user) {
      return UnauthorizedErrorResponse(res);
    }

    const imageUrls: string[] = [];

    if (req.files) {
      const files = req.files as Express.Multer.File[];

      for (const file of files) {
        const key = `problem-reports/${user._id}/${Date.now()}/${
          file.originalname
        }`;
        const contentType = file.mimetype;

        const { url, success, error } = await uploadFileToS3(
          file.buffer,
          AWS_S3_BUCKET_NAME,
          key,
          contentType
        );

        if (!success) {
          return ErrorResponse(
            res,
            STATUS_CODES.INTERNAL_SERVER_ERROR,
            false,
            "Error uploading file to S3: " + error
          );
        }

        imageUrls.push(url ?? "");
      }
    }

    const problemReport = await createProblemReport({
      user: user._id,
      category,
      message,
      images: imageUrls,
      timestamp: new Date(),
    });

    return SuccessOKResponse(
      res,
      problemReport,
      "Problem reported successfully."
    );
  } catch (error) {
    printError(error, "httpReportProblem");
    return ErrorResponse(res);
  }
};

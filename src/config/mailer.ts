import nodemailer from "nodemailer";
import {
  EMAIL_HOST,
  EMAIL_PORT,
  EMAIL_SENDER_PASSWORD,
  EMAIL_USERNAME,
} from "./environment";

const mailer = nodemailer.createTransport({
  host: EMAIL_HOST,
  port: Number(EMAIL_PORT),
  auth: {
    user: EMAIL_USERNAME,
    pass: EMAIL_SENDER_PASSWORD,
  },
});

export const SENDER_NAME = "MetaStart";

export default mailer;

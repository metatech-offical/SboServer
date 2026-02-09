import SMTPTransport from "nodemailer/lib/smtp-transport";

import mailer, { SENDER_NAME } from "../config/mailer";
import { EMAIL_SENDER_MAIL } from "../config/environment";

export const sendMail = (
  to: string,
  subject: string,
  body: string,
  html: boolean = false
) => {
  const options = {
    from: { name: SENDER_NAME, address: EMAIL_SENDER_MAIL },
    to,
    subject,
    ...(html ? { html: body } : { text: body }),
  };

  mailer
    .sendMail(options)
    .then((response: SMTPTransport.SentMessageInfo) => {
      console.log("Sent email, Reference id: ", response.messageId);
    })
    .catch((err: any) => {
      console.log("Email failed to send: ", err);
    });
};

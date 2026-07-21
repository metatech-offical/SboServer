import SMTPTransport from "nodemailer/lib/smtp-transport";

import mailer, { SENDER_NAME } from "../config/mailer";
import {
  EMAIL_SENDER_MAIL,
  RESEND_API_KEY,
  RESEND_FROM,
} from "../config/environment";

/**
 * Send email via Resend HTTPS API (works on Railway Hobby — SMTP ports are blocked).
 * Falls back to SMTP nodemailer for local development.
 *
 * For Resend production sending, set:
 *   RESEND_FROM=SBO <noreply@your-verified-domain.com>
 */
export const sendMail = async (
  to: string,
  subject: string,
  body: string,
  html: boolean = false
): Promise<void> => {
  if (RESEND_API_KEY) {
    // Prefer RESEND_FROM (verified domain). Never fall back to onboarding@resend.dev
    // in production — that only allows sending to the Resend account email.
    const from =
      RESEND_FROM ||
      (EMAIL_SENDER_MAIL && !EMAIL_SENDER_MAIL.endsWith("@gmail.com")
        ? `${SENDER_NAME} <${EMAIL_SENDER_MAIL}>`
        : "");

    if (!from) {
      throw new Error(
        "RESEND_FROM is required (e.g. SBO <noreply@metatech.ae>). Gmail cannot be used as Resend From."
      );
    }

    console.log(`Sending via Resend from=${from} to=${to}`);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        ...(html ? { html: body } : { text: body }),
      }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
      name?: string;
    };

    if (!res.ok) {
      console.error("Resend email failed:", res.status, data);
      throw new Error(
        data.message || data.name || `Resend failed with status ${res.status}`
      );
    }

    console.log("Sent email via Resend, id:", data.id);
    return;
  }

  const fromAddress = EMAIL_SENDER_MAIL;
  if (!fromAddress) {
    throw new Error(
      "Email not configured. Set RESEND_API_KEY + RESEND_FROM (Railway) or EMAIL_SENDER_MAIL + SMTP vars (local)."
    );
  }

  const options = {
    from: { name: SENDER_NAME, address: fromAddress },
    to,
    subject,
    ...(html ? { html: body } : { text: body }),
  };

  try {
    const response: SMTPTransport.SentMessageInfo = await mailer.sendMail(
      options
    );
    console.log("Sent email via SMTP, Reference id: ", response.messageId);
  } catch (err: any) {
    console.error("Email failed to send: ", err);
    throw err;
  }
};

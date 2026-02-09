import { CLIENT_URL } from "../config/environment";

export const EMAIL_VERIFICATION_MAIl = (token: string) => {
  const verificationUrl = CLIENT_URL + `/verify?token=${token}`;

  return {
    subject: "Verify Your Email Address",
    body: `Click the following link to verify your email address: ${verificationUrl}`,
  };
};

export const SIGNUP_EMAIL_CONTENT = (otp: string, username?: string) =>
  `Hello ${
    username || ""
  },\n\nYour OTP code is: ${otp}.\nIt will expire in 2 minutes.\n\nThank you!`;

  export const RESEND_SIGNUP_OTP_EMAIL_CONTENT = (
  otp: string,
  username?: string
) =>
  `Hello ${
    username || ""
  },\n\nYour OTP code is: ${otp}.\nIt will expire in 2 minutes.\n\nThank you!`;

export const RESET_PASSWORD_EMAIL_CONTENT = (otp: string, username?: string) =>
  `Hello ${
    username || ""
  },\n\nYour OTP for resetting the password is: ${otp}.\nIt will expire in 2 minutes.\n\nThank you!`;

export const EVENT_POSTPONED_EMAIL = (params: {
  userName: string;
  eventName: string;
  previousDate: string;
  newDate: string;
  reason?: string;
}) => {
  const reasonText = params.reason ? `\n\nReason: ${params.reason}` : "";
  return {
    subject: `Event Postponed: ${params.eventName}`,
    text: `Hello ${params.userName},\n\nWe wanted to inform you that the event "${params.eventName}" has been postponed.\n\nPrevious Date: ${params.previousDate}\nNew Date: ${params.newDate}${reasonText}\n\nYour ticket remains valid for the new date. If you cannot attend the rescheduled event, you can request a refund through your account.\n\nWe apologize for any inconvenience.\n\nBest regards,\nMetaStart Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background-color: white; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <h2 style="color: #f59e0b; margin-bottom: 24px;">Event Postponed</h2>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hello ${params.userName},</p>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            We wanted to inform you that the event <strong>"${params.eventName}"</strong> has been postponed.
          </p>
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 4px;">
            <p style="margin: 0; color: #92400e;"><strong>Previous Date:</strong> ${params.previousDate}</p>
            <p style="margin: 8px 0 0 0; color: #92400e;"><strong>New Date:</strong> ${params.newDate}</p>
          </div>
          ${params.reason ? `<p style="color: #374151; font-size: 14px; line-height: 1.6;"><strong>Reason:</strong> ${params.reason}</p>` : ""}
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Your ticket remains valid for the new date. If you cannot attend the rescheduled event, you can request a refund through your account.
          </p>
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 24px;">
            We apologize for any inconvenience.
          </p>
          <p style="color: #374151; font-size: 16px; margin-top: 32px;">Best regards,<br><strong>MetaStart Team</strong></p>
        </div>
      </div>
    `,
  };
};

export const EVENT_CANCELLED_EMAIL = (params: {
  userName: string;
  eventName: string;
  eventDate: string;
  reason?: string;
}) => {
  const reasonText = params.reason ? `\n\nReason: ${params.reason}` : "";
  return {
    subject: `Event Cancelled: ${params.eventName}`,
    text: `Hello ${params.userName},\n\nWe regret to inform you that the event "${params.eventName}" scheduled for ${params.eventDate} has been cancelled.${reasonText}\n\nA full refund will be processed to your original payment method within 5-7 business days.\n\nWe apologize for any inconvenience caused.\n\nBest regards,\nMetaStart Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background-color: white; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <h2 style="color: #ef4444; margin-bottom: 24px;">Event Cancelled</h2>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hello ${params.userName},</p>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            We regret to inform you that the event <strong>"${params.eventName}"</strong> scheduled for <strong>${params.eventDate}</strong> has been cancelled.
          </p>
          ${params.reason ? `<div style="background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 16px; margin: 24px 0; border-radius: 4px;"><p style="margin: 0; color: #991b1b;"><strong>Reason:</strong> ${params.reason}</p></div>` : ""}
          <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; margin: 24px 0; border-radius: 4px;">
            <p style="margin: 0; color: #065f46;">
              A full refund will be processed to your original payment method within 5-7 business days.
            </p>
          </div>
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
            We apologize for any inconvenience caused.
          </p>
          <p style="color: #374151; font-size: 16px; margin-top: 32px;">Best regards,<br><strong>MetaStart Team</strong></p>
        </div>
      </div>
    `,
  };
};

export const REFUND_APPROVED_EMAIL = (params: {
  userName: string;
  eventName: string;
  orderNumber: string;
  refundAmount: string;
}) => {
  return {
    subject: `Refund Approved: ${params.eventName}`,
    text: `Hello ${params.userName},\n\nYour refund request for "${params.eventName}" (Order #${params.orderNumber}) has been approved.\n\nRefund Amount: ${params.refundAmount}\n\nThe refund will be processed to your original payment method within 5-7 business days.\n\nBest regards,\nMetaStart Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background-color: white; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <h2 style="color: #10b981; margin-bottom: 24px;">Refund Approved</h2>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hello ${params.userName},</p>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Your refund request for <strong>"${params.eventName}"</strong> has been approved.
          </p>
          <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; margin: 24px 0; border-radius: 4px;">
            <p style="margin: 0; color: #065f46;"><strong>Order Number:</strong> ${params.orderNumber}</p>
            <p style="margin: 8px 0 0 0; color: #065f46;"><strong>Refund Amount:</strong> ${params.refundAmount}</p>
          </div>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            The refund will be processed to your original payment method within 5-7 business days.
          </p>
          <p style="color: #374151; font-size: 16px; margin-top: 32px;">Best regards,<br><strong>MetaStart Team</strong></p>
        </div>
      </div>
    `,
  };
};

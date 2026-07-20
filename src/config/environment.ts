import "dotenv/config";
import Joi from "joi";

/**
 * Environment Variable Validation Schema
 * - Required variables will cause the app to exit if missing
 * - Optional variables will show warnings if missing
 */
const envSchema = Joi.object({
  // Server Configuration
  NODE_ENV: Joi.string().valid("development", "production", "test").default("development"),
  PORT: Joi.number().default(8080),
  CORS_ORIGINS: Joi.string().default(""),
  CLIENT_URL: Joi.string().optional().allow(""),

  // Database (Required)
  MONGODB_URI: Joi.string().required().messages({
    "any.required": "MONGODB_URI is required for database connection",
    "string.empty": "MONGODB_URI cannot be empty",
  }),
  MONGO_MAX_POOL_SIZE: Joi.number().default(50),
  MONGO_MIN_POOL_SIZE: Joi.number().default(5),

  // Authentication (Required)
  JWT_SECRET: Joi.string().min(32).required().messages({
    "any.required": "JWT_SECRET is required for authentication",
    "string.min": "JWT_SECRET must be at least 32 characters for security",
  }),

  // Google OAuth (Optional - for social login)
  GOOGLE_CLIENT_ID: Joi.string().optional().allow(""),
  GOOGLE_CLIENT_SECRET: Joi.string().optional().allow(""),

  // Email Configuration (Optional - for sending emails)
  // Railway Hobby blocks SMTP — prefer RESEND_API_KEY (HTTPS)
  RESEND_API_KEY: Joi.string().optional().allow(""),
  RESEND_FROM: Joi.string().optional().allow(""),
  // Temporary: include OTP in API responses while email is being set up
  OTP_DEBUG: Joi.string().valid("true", "false").default("false"),
  EMAIL_HOST: Joi.string().optional().allow(""),
  EMAIL_PORT: Joi.string().optional().allow(""),
  EMAIL_SENDER_MAIL: Joi.string().optional().allow(""),
  EMAIL_USERNAME: Joi.string().default("apiKey"),
  EMAIL_SENDER_PASSWORD: Joi.string().optional().allow(""),

  // AWS S3 / Cloudflare R2 (Optional - for file uploads)
  AWS_ACCESS_KEY_ID: Joi.string().optional().allow(""),
  AWS_SECRET_ACCESS_KEY: Joi.string().optional().allow(""),
  AWS_REGION: Joi.string().optional().allow(""),
  AWS_S3_BUCKET_NAME: Joi.string().optional().allow(""),
  AWS_S3_ENDPOINT: Joi.string().optional().allow(""),
  AWS_S3_PUBLIC_URL: Joi.string().optional().allow(""),

  // Stripe (Optional - for payments)
  STRIPE_API_KEY: Joi.string().optional().allow(""),
  STRIPE_WEBHOOK_SECRET: Joi.string().optional().allow(""),

  // Redis (Optional - for caching/queues)
  REDIS_URL: Joi.string().optional().allow(""),
  REDIS_PASSWORD: Joi.string().optional().allow(""),
  REDIS_HOST: Joi.string().optional().allow(""),
  REDIS_PORT: Joi.string().default("6379"),
  REDIS_TLS: Joi.string().valid("true", "false").default("false"),

  // ZegoCloud (Optional - for streaming)
  APPID: Joi.number().optional().default(0),
  SERVER_SECRET: Joi.string().optional().allow(""),
  ZEGOCLOUD_DOMAIN: Joi.string().optional().allow(""),
  ZEGOCLOUD_S3_BUCKET_NAME: Joi.string().optional().allow(""),
  ZEGOCLOUD_S3_ACCESS_KEY_ID: Joi.string().optional().allow(""),
  ZEGOCLOUD_S3_SECRET_ACCESS_KEY: Joi.string().optional().allow(""),
  ZEGOCLOUD_S3_AWS_REGION: Joi.string().optional().allow(""),
  ZEGOCLOUD_RECORDING_OUTPUT_FORMAT: Joi.string().default("mp4"),
  ZEGOCLOUD_RECORDING_OUTPUT_DIR: Joi.string().default("sbo-vod"),
  ZEGOCLOUD_RECORDING_CALLBACK_URL: Joi.string().optional().allow(""),
  ZEGOCLOUD_CALLBACK_SECRET: Joi.string().optional().allow(""),
}).unknown(true); // Allow other env vars

// Validate environment variables
const { error, value: env } = envSchema.validate(process.env, {
  abortEarly: false,
  stripUnknown: false,
});

if (error) {
  console.error("\n╔════════════════════════════════════════════════════════════╗");
  console.error("║           ENVIRONMENT VALIDATION FAILED                      ║");
  console.error("╚════════════════════════════════════════════════════════════╝\n");

  error.details.forEach((detail) => {
    console.error(`  ❌ ${detail.message}`);
  });

  console.error("\n  Please check your .env file and ensure all required variables are set.\n");
  process.exit(1);
}

// Log warnings for optional but recommended variables
const optionalWarnings: string[] = [];

if (!env.REDIS_URL && !env.REDIS_HOST) {
  optionalWarnings.push("REDIS_URL or REDIS_HOST not set - caching and queues may not work");
}
if (!env.AWS_ACCESS_KEY_ID || !env.AWS_S3_BUCKET_NAME) {
  optionalWarnings.push("AWS credentials not fully configured - file uploads may not work");
}
if (!env.STRIPE_API_KEY) {
  optionalWarnings.push("STRIPE_API_KEY not set - payment features will not work");
}
if (!env.RESEND_API_KEY && (!env.EMAIL_HOST || !env.EMAIL_SENDER_PASSWORD)) {
  optionalWarnings.push(
    "Email not configured (set RESEND_API_KEY for Railway, or SMTP vars for local) - OTP emails will fail"
  );
}
if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
  optionalWarnings.push("Google OAuth not configured - social login will not work");
}
if (!env.ZEGOCLOUD_RECORDING_CALLBACK_URL) {
  optionalWarnings.push("ZEGOCLOUD_RECORDING_CALLBACK_URL not set - recording callbacks will fail");
}

if (optionalWarnings.length > 0) {
  console.warn("\n╔════════════════════════════════════════════════════════════╗");
  console.warn("║           ENVIRONMENT WARNINGS (Optional)                    ║");
  console.warn("╚════════════════════════════════════════════════════════════╝\n");
  optionalWarnings.forEach((warning) => {
    console.warn(`  ⚠️  ${warning}`);
  });
  console.warn("");
}

// Export validated environment variables
export const NODE_ENV = env.NODE_ENV;
export const PORT = env.PORT;
export const CORS_ORIGINS = env.CORS_ORIGINS;
export const CLIENT_URL = env.CLIENT_URL;

export const MONGODB_URI = env.MONGODB_URI;
export const MONGO_MAX_POOL_SIZE = env.MONGO_MAX_POOL_SIZE;
export const MONGO_MIN_POOL_SIZE = env.MONGO_MIN_POOL_SIZE;

export const JWT_SECRET = env.JWT_SECRET;

export const GOOGLE_CLIENT_ID = env.GOOGLE_CLIENT_ID || "";
export const GOOGLE_CLIENT_SECRET = env.GOOGLE_CLIENT_SECRET || "";

export const RESEND_API_KEY = env.RESEND_API_KEY || "";
export const OTP_DEBUG = env.OTP_DEBUG === "true";
export const EMAIL_HOST = env.EMAIL_HOST;
export const EMAIL_PORT = env.EMAIL_PORT || "";
export const EMAIL_SENDER_MAIL = env.EMAIL_SENDER_MAIL || "";
export const EMAIL_USERNAME = env.EMAIL_USERNAME;
export const EMAIL_SENDER_PASSWORD = env.EMAIL_SENDER_PASSWORD || "";

export const AWS_ACCESS_KEY_ID = env.AWS_ACCESS_KEY_ID || "";
export const AWS_SECRET_ACCESS_KEY = env.AWS_SECRET_ACCESS_KEY || "";
export const AWS_REGION = env.AWS_REGION || "";
export const AWS_S3_BUCKET_NAME = env.AWS_S3_BUCKET_NAME || "";
export const AWS_S3_ENDPOINT = env.AWS_S3_ENDPOINT || "";
export const AWS_S3_PUBLIC_URL = env.AWS_S3_PUBLIC_URL || "";

export const STRIPE_API_KEY = env.STRIPE_API_KEY || "";
export const STRIPE_WEBHOOK_SECRET = env.STRIPE_WEBHOOK_SECRET || "";

export const REDIS_URL = env.REDIS_URL || "";
export const REDIS_PASSWORD = env.REDIS_PASSWORD || "";
export const REDIS_HOST = env.REDIS_HOST || "";
export const REDIS_PORT = env.REDIS_PORT;
export const REDIS_TLS = env.REDIS_TLS === "true";

export const APPID = env.APPID;
export const SERVER_SECRET = env.SERVER_SECRET || "";
export const ZEGOCLOUD_DOMAIN = env.ZEGOCLOUD_DOMAIN || "";
export const ZEGOCLOUD_S3_BUCKET_NAME = env.ZEGOCLOUD_S3_BUCKET_NAME || "";
export const ZEGOCLOUD_S3_ACCESS_KEY_ID = env.ZEGOCLOUD_S3_ACCESS_KEY_ID || "";
export const ZEGOCLOUD_S3_SECRET_ACCESS_KEY = env.ZEGOCLOUD_S3_SECRET_ACCESS_KEY || "";
export const ZEGOCLOUD_S3_AWS_REGION = env.ZEGOCLOUD_S3_AWS_REGION || "";
export const ZEGOCLOUD_RECORDING_OUTPUT_FORMAT = env.ZEGOCLOUD_RECORDING_OUTPUT_FORMAT;
export const ZEGOCLOUD_RECORDING_OUTPUT_DIR = env.ZEGOCLOUD_RECORDING_OUTPUT_DIR;
export const ZEGOCLOUD_RECORDING_CALLBACK_URL = env.ZEGOCLOUD_RECORDING_CALLBACK_URL;
export const ZEGOCLOUD_CALLBACK_SECRET = env.ZEGOCLOUD_CALLBACK_SECRET || "";

// Success message
console.log("\n✅ Environment variables validated successfully\n");

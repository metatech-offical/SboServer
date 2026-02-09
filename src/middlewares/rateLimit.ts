import rateLimit from "express-rate-limit";

// Auth rate limiter - limits login attempts per IP
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per IP per 15 minutes
  message: { success: false, message: "Too many authentication attempts" },
  standardHeaders: true,
  legacyHeaders: false,
});

// OTP request rate limiter - limits OTP requests per IP
export const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 OTP requests per IP per hour
  message: { success: false, message: "Too many OTP requests" },
  standardHeaders: true,
  legacyHeaders: false,
});

// OTP verification rate limiter - prevents brute force attacks on 4-digit OTPs
export const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 verification attempts per IP per 15 minutes
  message: { success: false, message: "Too many OTP verification attempts. Please request a new OTP." },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { success: false, message: "Too many requests" },
  standardHeaders: true,
  legacyHeaders: false,
});

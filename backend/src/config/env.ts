import { z } from "zod";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// Load environment variables from .env
dotenv.config();

/**
 * Zod schema for validating all required environment variables.
 * Explicitly typed and parsed to ensure runtime correctness.
 */
const envSchema = z.object({
  // App
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().default(3000),
  APP_NAME: z.string().default("SkilledSA"),
  API_URL: z.string().url(),
  FRONTEND_URL: z.string().url(),

  // Database
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  // JWT (RS256) – paths to PEM files
  JWT_PRIVATE_KEY_PATH: z.string().min(1, "JWT private key path is required"),
  JWT_PUBLIC_KEY_PATH: z.string().min(1, "JWT public key path is required"),

  // AWS S3
  AWS_REGION: z.string().default("af-south-1"),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  S3_BUCKET_NAME: z.string().min(1),
  S3_PRESIGNED_URL_EXPIRY: z.coerce.number().default(60), // seconds

  // Email (SendGrid)
  SENDGRID_API_KEY: z.string().min(1),
  SENDGRID_FROM_EMAIL: z.string().email(),

  // SMS (Twilio)
  TWILIO_ACCOUNT_SID: z.string().min(1),
  TWILIO_AUTH_TOKEN: z.string().min(1),
  TWILIO_PHONE_NUMBER: z.string().min(1),

  // Logging
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
  LOG_FILE_PATH: z.string().optional(),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000), // 15 min
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(5), // for login
  RATE_LIMIT_GENERAL_WINDOW_MS: z.coerce.number().default(60000), // 1 min
  RATE_LIMIT_GENERAL_MAX: z.coerce.number().default(100), // requests per minute

  // Feature flags
  FEATURE_REFERRALS: z.coerce.boolean().default(false),
});

// Parse and export the validated environment
export const env = envSchema.parse(process.env);
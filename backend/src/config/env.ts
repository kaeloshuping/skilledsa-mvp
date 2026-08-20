import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

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

  // JWT (RS256) – private/public keys
  JWT_PRIVATE_KEY: z.string().min(1, "JWT private key is required"),
  JWT_PUBLIC_KEY: z.string().min(1, "JWT public key is required"),

  // AWS S3
  AWS_REGION: z.string().default("af-south-1"),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  S3_BUCKET_NAME: z.string().min(1),
  S3_PRESIGNED_URL_EXPIRY: z.coerce.number().default(60),

  // Google Maps
  GOOGLE_MAPS_API_KEY: z.string().min(1, "Google Maps API key is required"),

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
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(5),
  RATE_LIMIT_GENERAL_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_GENERAL_MAX: z.coerce.number().default(100),

  // Feature flags
  FEATURE_REFERRALS: z.coerce.boolean().default(false),
});

export const env = envSchema.parse(process.env);
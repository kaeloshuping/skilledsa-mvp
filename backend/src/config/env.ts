import { z } from "zod";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Get the directory name of the current module (ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the project root (two levels up from src/config)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

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
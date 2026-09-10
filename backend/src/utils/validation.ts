import { z } from "zod";

/**
 * Zod schemas for request validation.
 */

// Password: min 8 chars, at least one uppercase and one number
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: passwordSchema,
  full_name: z.string().min(1, "Full name is required"),
  role: z.enum(["customer", "contractor", "admin"]),
  phone: z.string().optional(),
  popia_consent: z.boolean().refine((val) => val === true, {
    message: "You must consent to POPIA",
  }),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

/**
 * Schema for logout — token is optional (idempotent behaviour).
 */
export const logoutSchema = z.object({
  refreshToken: z.string().optional(),
});

/**
 * Legacy profile update schema (still used by PUT /users/:id).
 */
export const updateProfileSchema = z.object({
  full_name: z.string().optional(),
  phone: z.string().optional(),
  notification_preference: z.record(z.any()).optional(),
});

/**
 * Schema for the new PUT /users/me endpoint.
 * All fields optional (partial update).
 */
export const updateMeSchema = z.object({
  fullName: z.string().min(1).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  travelFeePerKm: z.number().min(5).max(15).optional(),
  notificationPrefs: z
    .object({
      email: z.boolean().optional(),
      sms: z.boolean().optional(),
      push: z.boolean().optional(),
    })
    .optional(),
});

// For verification submission
export const verificationSubmitSchema = z.object({
  id_photo_url: z.string().url(),
  selfie_url: z.string().url(),
  certificate_url: z.string().url().optional(),
});

// For admin review
export const verificationReviewSchema = z.object({
  notes: z.string().optional(),
});

// ============================================================
// JOB SCHEMAS
// ============================================================

/**
 * Schema for creating a job.
 * All fields are required for creation.
 */
export const createJobSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  trade: z.string().min(1, "Trade is required"),
  photos: z.array(z.string().url()).optional().default([]),
  locationLat: z.number().min(-90).max(90, "Latitude must be between -90 and 90"),
  locationLng: z.number().min(-180).max(180, "Longitude must be between -180 and 180"),
  needsConsultation: z.boolean().default(false),
  travelFeeAccepted: z.boolean().default(true),
});

/**
 * Schema for updating a job.
 */
export const updateJobSchema = createJobSchema.partial();

/**
 * Valid JobStatus values as defined in the Prisma schema.
 */
const jobStatusEnum = z.enum([
  "draft",
  "open",
  "quoted",
  "accepted",
  "milestone1_pending",
  "milestone1_verified",
  "milestone2_pending",
  "completed",
  "disputed",
  "cancelled",
]);

/**
 * Schema for listing jobs with query filters.
 * `city` takes precedence over lat/lng/radius.
 */
export const listJobsQuerySchema = z.object({
  trade: z.string().optional(),
  city: z.string().optional(),
  customerId: z.string().uuid().optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().positive().default(35), // in km
  travelFeeAccepted: z.coerce.boolean().optional(),
  status: jobStatusEnum.optional().default("open"),
});

// ============================================================
// ADMIN SCHEMAS
// ============================================================

/**
 * Schema for admin user list query.
 */
export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  role: z.enum(["customer", "contractor", "admin"]).optional(),
  verificationStatus: z
    .enum(["pending", "verified", "rejected"])
    .optional(),
  search: z.string().optional(),
});
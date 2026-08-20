import { z } from 'zod';

/**
 * Zod schemas for request validation.
 */

// Password: min 8 chars, at least one uppercase and one number
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: passwordSchema,
  full_name: z.string().min(1, 'Full name is required'),
  role: z.enum(['customer', 'contractor', 'admin']),
  phone: z.string().optional(),
  popia_consent: z.boolean().refine(val => val === true, {
    message: 'You must consent to POPIA',
  }),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const updateProfileSchema = z.object({
  full_name: z.string().optional(),
  phone: z.string().optional(),
  notification_preference: z.record(z.any()).optional(),
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

// ... (existing schemas)

/**
 * Schema for creating a job.
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
 * Schema for updating a job (all fields optional).
 */
export const updateJobSchema = createJobSchema.partial();

/**
 * Schema for listing jobs with query filters.
 */
export const listJobsQuerySchema = z.object({
  trade: z.string().optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().positive().default(35), // km
  travelFeeAccepted: z.coerce.boolean().optional(),
  status: z.enum(['draft', 'open', 'quoted', 'accepted', 'active', 'completed', 'cancelled']).optional().default('open'),
});
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
  role: z.enum(['customer', 'contractor']),
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
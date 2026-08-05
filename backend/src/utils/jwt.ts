import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env.js';

export interface JwtPayload {
  user_id: string;
  email: string;
  role: string;
  verification_status: string;
}

/**
 * Generate an access token (expires in 15 minutes) using RS256.
 */
export const generateAccessToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, env.JWT_PRIVATE_KEY, {
    algorithm: 'RS256',
    expiresIn: '15m',
  });
};

/**
 * Generate a refresh token (expires in 7 days) using RS256.
 */
export const generateRefreshToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, env.JWT_PRIVATE_KEY, {
    algorithm: 'RS256',
    expiresIn: '7d',
  });
};

/**
 * Verify an access token.
 * Returns the decoded payload or throws an error.
 */
export const verifyAccessToken = (token: string): JwtPayload => {
  return jwt.verify(token, env.JWT_PUBLIC_KEY, { algorithms: ['RS256'] }) as JwtPayload;
};

/**
 * Verify a refresh token.
 * Returns the decoded payload or throws an error.
 */
export const verifyRefreshToken = (token: string): JwtPayload => {
  return jwt.verify(token, env.JWT_PUBLIC_KEY, { algorithms: ['RS256'] }) as JwtPayload;
};

/**
 * Hash a refresh token (SHA-256) for storage in the database.
 */
export const hashRefreshToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};
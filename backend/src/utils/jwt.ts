import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from '../config/env.js';

export interface JwtPayload {
  user_id: string;
  email: string;
  role: string;
  verification_status: string;
}

// Derive __dirname equivalent in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cache keys in memory after first read
let privateKey: string | null = null;
let publicKey: string | null = null;

/**
 * Reads the private key from the file path specified in environment.
 * Throws an error if the file is missing or unreadable.
 */
const getPrivateKey = (): string => {
  if (privateKey) return privateKey;
  // Resolve path relative to the project root (two levels up from this file: utils -> src -> backend)
  const keyPath = path.resolve(__dirname, '../../', env.JWT_PRIVATE_KEY_PATH);
  try {
    privateKey = fs.readFileSync(keyPath, 'utf8');
    return privateKey;
  } catch (error) {
    throw new Error(`Failed to read private key from ${keyPath}: ${(error as Error).message}`);
  }
};

/**
 * Reads the public key from the file path specified in environment.
 * Throws an error if the file is missing or unreadable.
 */
const getPublicKey = (): string => {
  if (publicKey) return publicKey;
  const keyPath = path.resolve(__dirname, '../../', env.JWT_PUBLIC_KEY_PATH);
  try {
    publicKey = fs.readFileSync(keyPath, 'utf8');
    return publicKey;
  } catch (error) {
    throw new Error(`Failed to read public key from ${keyPath}: ${(error as Error).message}`);
  }
};

/**
 * Generate an access token (expires in 15 minutes) using RS256.
 */
export const generateAccessToken = (payload: JwtPayload): string => {
  const privateKey = getPrivateKey();
  return jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
    expiresIn: '15m',
  });
};

/**
 * Generate a refresh token (expires in 7 days) using RS256.
 */
export const generateRefreshToken = (payload: JwtPayload): string => {
  const privateKey = getPrivateKey();
  return jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
    expiresIn: '7d',
  });
};

/**
 * Verify an access token.
 * Returns the decoded payload or throws an error.
 */
export const verifyAccessToken = (token: string): JwtPayload => {
  const publicKey = getPublicKey();
  return jwt.verify(token, publicKey, { algorithms: ['RS256'] }) as JwtPayload;
};

/**
 * Verify a refresh token.
 * Returns the decoded payload or throws an error.
 */
export const verifyRefreshToken = (token: string): JwtPayload => {
  const publicKey = getPublicKey();
  return jwt.verify(token, publicKey, { algorithms: ['RS256'] }) as JwtPayload;
};

/**
 * Hash a refresh token (SHA-256) for storage in the database.
 */
export const hashRefreshToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};
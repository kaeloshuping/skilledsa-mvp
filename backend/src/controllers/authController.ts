import { Request, Response } from 'express';
import { AuthService } from '../services/authService.js';
import { getLogger } from '../utils/logger.js';
import {
  signupSchema,
  loginSchema,
  refreshTokenSchema,
} from '../utils/validation.js';
import { ZodError } from 'zod';
import { RequestWithId } from '../middleware/requestTracing.js';
import {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} from '../utils/jwt.js';
import prisma from '../config/database.js';

export class AuthController {
  /**
   * POST /api/v1/auth/signup
   */
  static async signup(req: Request, res: Response): Promise<void> {
    const log = getLogger((req as RequestWithId).requestId);
    try {
      const data = signupSchema.parse(req.body);
      const user = await AuthService.register(data);

      const payload = {
        user_id: user.id,
        email: user.email,
        role: user.role,
        verification_status: user.verification_status,
      };
      const accessToken = generateAccessToken(payload);
      const refreshToken = generateRefreshToken(payload);

      const tokenHash = hashRefreshToken(refreshToken);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await prisma.refreshToken.create({
        data: {
          user_id: user.id,
          token_hash: tokenHash,
          expires_at: expiresAt,
          revoked: false,
        },
      });

      log.info('[BE1] - Signup successful with tokens', { userId: user.id });
      res.status(201).json({ user, accessToken, refreshToken });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: 'Validation error', details: error.errors });
        return;
      }
      log.error('[BE1] - Signup error', { error: (error as Error).message });
      res.status(400).json({ error: (error as Error).message });
    }
  }

  /**
   * POST /api/v1/auth/login
   */
  static async login(req: Request, res: Response): Promise<void> {
    const log = getLogger((req as RequestWithId).requestId);
    try {
      const { email, password } = loginSchema.parse(req.body);
      const { user, accessToken, refreshToken } = await AuthService.login(email, password);
      log.info('[BE1] - Login successful', { userId: user.id });
      res.json({ user, accessToken, refreshToken });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: 'Validation error', details: error.errors });
        return;
      }
      log.error('[BE1] - Login error', { error: (error as Error).message });
      res.status(401).json({ error: (error as Error).message });
    }
  }

  /**
   * POST /api/v1/auth/refresh
   */
  static async refresh(req: Request, res: Response): Promise<void> {
    const log = getLogger((req as RequestWithId).requestId);
    try {
      const { refreshToken } = refreshTokenSchema.parse(req.body);
      const result = await AuthService.refresh(refreshToken);
      log.info('[BE1] - Token refresh successful');
      res.json(result);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: 'Validation error', details: error.errors });
        return;
      }
      log.error('[BE1] - Refresh error', { error: (error as Error).message });
      res.status(401).json({ error: (error as Error).message });
    }
  }

  /**
   * POST /api/v1/auth/logout
   * Idempotent. Accepts a refresh token from the body OR the Authorization header.
   */
  static async logout(req: Request, res: Response): Promise<void> {
    const log = getLogger((req as RequestWithId).requestId);
    try {
      // Accept refresh token from body, or fall back to the Bearer token
      let refreshToken: string | undefined = req.body?.refreshToken;
      if (!refreshToken) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          refreshToken = authHeader.split(' ')[1];
        }
      }

      log.debug('[BE1] - Logout request received', {
        hasBodyToken: Boolean(req.body?.refreshToken),
        hasHeaderToken: Boolean(req.headers.authorization),
      });

      await AuthService.logout(refreshToken);

      log.info('[BE1] - Logout successful');
      res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      log.error('[BE1] - Logout error', { error: (error as Error).message });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /api/v1/auth/me
   */
  static async me(req: Request, res: Response): Promise<void> {
    const log = getLogger((req as RequestWithId).requestId);
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthenticated' });
        return;
      }
      const { UserService } = await import('../services/userService.js');
      const user = await UserService.getUserById(req.user.user_id);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      res.json({ user });
    } catch (error) {
      log.error('[BE1] - Me error', { error: (error as Error).message });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
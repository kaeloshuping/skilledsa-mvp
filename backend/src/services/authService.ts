import bcrypt from 'bcryptjs';
import prisma from '../config/database.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashRefreshToken,
  JwtPayload,
} from '../utils/jwt.js';
import { getLogger } from '../utils/logger.js';
import { User } from '@prisma/client';

/**
 * AuthService handles authentication logic: registration, login, refresh, logout.
 */
export class AuthService {
  /**
   * Register a new user.
   */
  static async register(data: {
    email: string;
    password: string;
    full_name: string;
    role: 'customer' | 'contractor';
    phone?: string;
    popia_consent: boolean;
  }): Promise<Omit<User, 'password_hash'>> {
    const log = getLogger();

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new Error('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        password_hash: hashedPassword,
        full_name: data.full_name,
        role: data.role,
        phone: data.phone,
        popia_consent: data.popia_consent,
        verification_status: 'pending',
      },
    });

    log.info('[BE1] - User registered', { userId: user.id, email: user.email });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Login: verify credentials, generate tokens, store refresh token hash.
   */
  static async login(email: string, password: string) {
    const log = getLogger();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new Error('Invalid email or password');
    }
    if (!user.is_active) {
      throw new Error('Account is deactivated');
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { last_login: new Date() },
    });

    const payload: JwtPayload = {
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

    log.info('[BE1] - User logged in', { userId: user.id, email: user.email });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, accessToken, refreshToken };
  }

  /**
   * Refresh tokens: validate refresh token, issue new ones, revoke old.
   */
  static async refresh(refreshToken: string) {
    const log = getLogger();
    let payload: JwtPayload;
    try {
      payload = verifyRefreshToken(refreshToken);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      throw new Error('Invalid or expired refresh token');
    }

    const tokenHash = hashRefreshToken(refreshToken);
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token_hash: tokenHash },
    });
    if (!storedToken || storedToken.revoked || storedToken.expires_at < new Date()) {
      throw new Error('Refresh token revoked or expired');
    }

    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked: true },
    });

    const user = await prisma.user.findUnique({ where: { id: payload.user_id } });
    if (!user) {
      throw new Error('User not found');
    }

    const newPayload: JwtPayload = {
      user_id: user.id,
      email: user.email,
      role: user.role,
      verification_status: user.verification_status,
    };
    const newAccessToken = generateAccessToken(newPayload);
    const newRefreshToken = generateRefreshToken(newPayload);

    const newTokenHash = hashRefreshToken(newRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.create({
      data: {
        user_id: user.id,
        token_hash: newTokenHash,
        expires_at: expiresAt,
        revoked: false,
      },
    });

    log.info('[BE1] - Tokens refreshed', { userId: user.id });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  /**
   * Logout: revoke the specific refresh token.
   */
  static async logout(refreshToken: string): Promise<void> {
    const log = getLogger();
    const tokenHash = hashRefreshToken(refreshToken);
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token_hash: tokenHash },
    });
    if (storedToken) {
      await prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revoked: true },
      });
      log.info('[BE1] - Refresh token revoked');
    }
  }
}
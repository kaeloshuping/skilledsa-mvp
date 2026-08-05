import prisma from '../config/database.js';
import { Prisma, User } from '@prisma/client';
import { getLogger } from '../utils/logger.js';

export class UserService {
  /**
   * Get a user by ID (excluding password hash).
   */
  static async getUserById(id: string): Promise<Omit<User, 'password_hash'> | null> {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        verification_request: true,
      },
    });
    if (!user) return null;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Update user profile (partial update).
   * notification_preference must be a valid JSON object (Prisma.InputJsonValue).
   */
  static async updateUser(
    id: string,
    data: {
      full_name?: string;
      phone?: string;
      notification_preference?: Prisma.InputJsonValue; // ✅ Correct type for JSON writes
    },
  ): Promise<Omit<User, 'password_hash'> | null> {
    const log = getLogger();
    const user = await prisma.user.update({
      where: { id },
      data: {
        full_name: data.full_name,
        phone: data.phone,
        notification_preference: data.notification_preference,
      },
    });
    log.info('[BE1] - User updated', { userId: user.id });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
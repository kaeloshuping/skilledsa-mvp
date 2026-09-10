import prisma from '../config/database.js';
import { Prisma, User } from '@prisma/client';
import { getLogger } from '../utils/logger.js';

/**
 * Extended user shape including fields that BE2 will add to the schema.
 * Kept locally to avoid TS errors until the Prisma client is regenerated.
 */
type UserWithExtendedFields = User & {
  address?: string | null;
  city?: string | null;
  travelFeePerKm?: number | null;
  travelFeeLastChangedAt?: Date | null;
};

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
   * Apply the travel-fee change rules.
   *
   * @param user – the target user (must already exist in the DB)
   * @param newFee – requested new travel fee (km rate)
   * @param isAdminOverride – true when the caller is an admin (allows within-30-day change with a warn log)
   * @returns the fields to be written (travelFeePerKm + travelFeeLastChangedAt) or an empty object
   */
  private static applyTravelFeeChange(
    user: UserWithExtendedFields,
    newFee: number | undefined,
    isAdminOverride: boolean,
  ): { travelFeePerKm?: number; travelFeeLastChangedAt?: Date } {
    if (newFee === undefined) return {};

    if (user.role !== 'contractor') {
      throw new Error('Only contractors can set a travel fee');
    }
    if (newFee < 5 || newFee > 15) {
      throw new Error('Travel fee must be between R5 and R15 per km');
    }

    if (user.travelFeeLastChangedAt) {
      const daysSince =
        (Date.now() - new Date(user.travelFeeLastChangedAt).getTime()) /
        (1000 * 60 * 60 * 24);

      if (daysSince < 30) {
        if (isAdminOverride) {
          getLogger().warn('[BE1] - Admin override: travel fee changed within 30 days', {
            userId: user.id,
            daysSince: Math.floor(daysSince),
          });
        } else {
          throw new Error(
            `Travel fee can only be changed once per month. Last change was ${Math.floor(daysSince)} days ago.`,
          );
        }
      }
    }

    return { travelFeePerKm: newFee, travelFeeLastChangedAt: new Date() };
  }

  /**
   * Update the current user's own profile (PUT /users/me).
   */
  static async updateMe(
    userId: string,
    data: {
      fullName?: string;
      phone?: string;
      address?: string;
      city?: string;
      travelFeePerKm?: number;
      notificationPrefs?: Record<string, unknown>;
    },
  ): Promise<Omit<User, 'password_hash'>> {
    const log = getLogger();

    const existing = (await prisma.user.findUnique({
      where: { id: userId },
    })) as UserWithExtendedFields | null;
    if (!existing) throw new Error('User not found');

    const feeFields = this.applyTravelFeeChange(existing, data.travelFeePerKm, false);

    const updateData: Prisma.UserUpdateInput = {};
    if (data.fullName !== undefined) updateData.full_name = data.fullName;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.address !== undefined) {
      (updateData as Prisma.UserUpdateInput & { address?: string }).address = data.address;
    }
    if (data.city !== undefined) {
      (updateData as Prisma.UserUpdateInput & { city?: string }).city = data.city;
    }
    if (data.notificationPrefs !== undefined) {
      updateData.notification_preference = data.notificationPrefs as Prisma.InputJsonValue;
    }
    if (feeFields.travelFeePerKm !== undefined) {
      (
        updateData as Prisma.UserUpdateInput & { travelFeePerKm?: number }
      ).travelFeePerKm = feeFields.travelFeePerKm;
    }
    if (feeFields.travelFeeLastChangedAt !== undefined) {
      (
        updateData as Prisma.UserUpdateInput & { travelFeeLastChangedAt?: Date }
      ).travelFeeLastChangedAt = feeFields.travelFeeLastChangedAt;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    log.info('[BE1] - User profile updated (self)', { userId });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...userWithoutPassword } = updated;
    return userWithoutPassword;
  }

  /**
   * Legacy profile update (PUT /users/:id).
   * Accepts snake_case fields. Used by admin or self.
   */
  static async updateUser(
    id: string,
    data: {
      full_name?: string;
      phone?: string;
      notification_preference?: Prisma.InputJsonValue;
    },
    options: { isAdmin?: boolean } = {},
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
    log.info('[BE1] - User updated (legacy endpoint)', {
      userId: user.id,
      isAdmin: Boolean(options.isAdmin),
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Admin: paginated list of users with filters.
   */
  static async listUsers(filters: {
    page: number;
    limit: number;
    role?: 'customer' | 'contractor' | 'admin';
    verificationStatus?: 'pending' | 'verified' | 'rejected';
    search?: string;
  }): Promise<{
    users: Array<{
      id: string;
      email: string;
      fullName: string;
      role: string;
      phone: string | null;
      verificationStatus: string;
      isActive: boolean;
      createdAt: Date;
      city: string | null;
    }>;
    total: number;
    page: number;
    limit: number;
  }> {
    const log = getLogger();
    const { page, limit, role, verificationStatus, search } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};
    if (role) where.role = role;
    if (verificationStatus) where.verification_status = verificationStatus;
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { full_name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          email: true,
          full_name: true,
          role: true,
          phone: true,
          verification_status: true,
          is_active: true,
          created_at: true,
          // city is expected from BE2; Prisma will expose it once the field exists.
          // If the field isn't there yet, remove this line.
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore – field will be present once BE2 updates schema
          city: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    const users = rows.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.full_name,
      role: u.role,
      phone: u.phone,
      verificationStatus: u.verification_status,
      isActive: u.is_active,
      createdAt: u.created_at,
      city: (u as { city?: string | null }).city ?? null,
    }));

    log.debug('[BE1] - Admin listed users', { count: users.length, total, page, limit });
    return { users, total, page, limit };
  }
}
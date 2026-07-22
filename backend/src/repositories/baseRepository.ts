import prisma from '../config/database.js';
import { Prisma } from '@prisma/client';

/**
 * Generic repository class providing basic CRUD operations.
 * Intended to be extended by specific repositories (e.g., UserRepository).
 *
 * @template T – The model type (e.g., User)
 * @template CreateInput – The Prisma create input type
 * @template UpdateInput – The Prisma update input type
 */
export class BaseRepository<T, CreateInput, UpdateInput> {
  constructor(private model: Prisma.ModelName) {}

  async create(data: CreateInput): Promise<T> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (prisma as any)[this.model].create({ data }) as Promise<T>;
  }

  async findById(id: string): Promise<T | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (prisma as any)[this.model].findUnique({ where: { id } }) as Promise<T | null>;
  }

  async findAll(params?: { where?: unknown; include?: unknown; skip?: number; take?: number }): Promise<T[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (prisma as any)[this.model].findMany(params || {}) as Promise<T[]>;
  }

  async update(id: string, data: UpdateInput): Promise<T> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (prisma as any)[this.model].update({ where: { id }, data }) as Promise<T>;
  }

  async delete(id: string): Promise<T> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (prisma as any)[this.model].delete({ where: { id } }) as Promise<T>;
  }

  async count(where?: unknown): Promise<number> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (prisma as any)[this.model].count({ where }) as Promise<number>;
  }
}
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
    return (prisma as any)[this.model].create({ data });
  }

  async findById(id: string): Promise<T | null> {
    return (prisma as any)[this.model].findUnique({ where: { id } });
  }

  async findAll(params?: { where?: any; include?: any; skip?: number; take?: number }): Promise<T[]> {
    return (prisma as any)[this.model].findMany(params || {});
  }

  async update(id: string, data: UpdateInput): Promise<T> {
    return (prisma as any)[this.model].update({ where: { id }, data });
  }

  async delete(id: string): Promise<T> {
    return (prisma as any)[this.model].delete({ where: { id } });
  }

  async count(where?: any): Promise<number> {
    return (prisma as any)[this.model].count({ where });
  }
}
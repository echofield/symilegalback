import { PrismaClient } from '@prisma/client';

// Share a single Prisma client across hot reloads in dev
export const prisma: PrismaClient = (globalThis as any).__prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') (globalThis as any).__prisma = prisma;



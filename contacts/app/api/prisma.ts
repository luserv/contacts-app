import { PrismaClient } from '@prisma/client';

// ensure a single client instance for hot reload / development
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  global.prisma || new PrismaClient({ log: ['query'] });

if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

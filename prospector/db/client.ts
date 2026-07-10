import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from './generated/client.ts';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

/** Shared Prisma client for the whole app (Postgres via DATABASE_URL). */
export const prisma = new PrismaClient({ adapter });

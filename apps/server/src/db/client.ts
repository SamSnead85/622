import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

// ============================================
// DATABASE CLIENT — Production-grade Prisma configuration
// ============================================
//
// Connection strategy:
//   DATABASE_URL  → used at runtime (should point to Supabase session-mode pooler on port 5432)
//   DIRECT_URL    → used by `prisma migrate` only (bypasses pgBouncer, goes direct to Postgres)
//
// Required DATABASE_URL query params for Supabase pooler:
//   ?pgbouncer=true&connection_limit=10&connect_timeout=15&pool_timeout=15&sslmode=require
//
// These params are appended here if missing, so the .env value can stay clean.
// ============================================

function buildDatabaseUrl(): string {
    const raw = process.env.DATABASE_URL;
    if (!raw) {
        throw new Error('FATAL: DATABASE_URL is not set. Cannot connect to database.');
    }

    // If the URL already has query params, trust them — operator knows best
    if (raw.includes('?')) return raw;

    // For Supabase pooler connections: append production-safe defaults
    const isSupabase = raw.includes('supabase.com') || raw.includes('pooler.supabase.com');
    if (isSupabase) {
        return `${raw}?pgbouncer=true&connection_limit=25&connect_timeout=15&pool_timeout=15&sslmode=require`;
    }

    // For non-Supabase (local dev, self-hosted): just set a reasonable connection limit
    return `${raw}?connection_limit=30&connect_timeout=15`;
}

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        log: process.env.NODE_ENV === 'development'
            ? ['query', 'error', 'warn']
            : ['error'],
        datasources: {
            db: {
                url: buildDatabaseUrl(),
            },
        },
    });

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

// Log connection info at startup (masked)
const dbUrl = process.env.DATABASE_URL || '';
const maskedUrl = dbUrl.replace(/:[^:@]+@/, ':****@');
logger.info(`Database configured: ${maskedUrl.split('?')[0]}`);

// Graceful disconnect on app shutdown
process.on('beforeExit', async () => {
    await prisma.$disconnect();
});

process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
});

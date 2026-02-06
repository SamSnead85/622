import { PrismaClient } from '@prisma/client';

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
                url: process.env.DATABASE_URL,
            },
        },
    });

// Connection pool configuration note:
// Prisma uses the connection string parameters for pooling.
// Append these to DATABASE_URL for production:
//   ?connection_limit=20&pool_timeout=30
// For Supabase with pgBouncer, use:
//   ?pgbouncer=true&connection_limit=10
// The DIRECT_URL (without pooling) is used for migrations only.

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

// Graceful disconnect on app shutdown
process.on('beforeExit', async () => {
    await prisma.$disconnect();
});

// Handle SIGINT for graceful shutdown
process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
});

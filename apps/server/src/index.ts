import express, { Application } from 'express';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import dotenv from 'dotenv';
import * as Sentry from '@sentry/node';
import { rateLimiters } from './middleware/rateLimit.js';

import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { postsRouter } from './routes/posts.js';
import { communitiesRouter } from './routes/communities.js';
import { messagesRouter } from './routes/messages.js';
import momentsRouter from './routes/moments.js';
import { journeysRouter } from './routes/journeys.js';
import { notificationsRouter } from './routes/notifications.js';
import { livestreamRouter } from './routes/livestream.js';
import uploadRouter from './routes/upload.js';
import securityRouter from './routes/security.js';
import communityRouter from './routes/community.js';
import { subscriptionRouter } from './routes/subscriptions.js';
import { reportRouter } from './routes/reports.js';
import migrationRouter from './routes/migration.js';
import topicsRouter from './routes/topics.js';
import e2eRouter from './routes/e2e.js';
import scheduleRouter from './routes/schedule.js';
import preferencesRouter from './routes/preferences.js';
import governanceRouter from './routes/governance.js';
import pushRouter from './routes/push.js';
import analyticsRouter from './routes/analytics.js';
import searchRouter from './routes/search.js';
import exportRouter from './routes/export.js';
import inviteRouter from './routes/invite.js';
import circlesRouter from './routes/circles.js';
import { developerRouter } from './routes/developer.js';
import adminRouter from './routes/admin.js';
import campaignsRouter from './routes/campaigns.js';
import creatorsRouter from './routes/creators.js';
import growthRouter from './routes/growth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';
import { setupSocketHandlers } from './socket/index.js';
import { initNotificationQueue, shutdownNotificationQueue } from './services/notifications/NotificationQueue.js';
import { initScheduleWorker, shutdownScheduleWorker } from './services/schedule/ScheduleWorker.js';
import { initGrowthQualificationWorker, shutdownGrowthQualificationWorker } from './services/schedule/GrowthQualificationWorker.js';
import './services/games/index.js';

// Load environment variables
dotenv.config();

// ============================================
// STARTUP VALIDATION — fail fast on misconfiguration
// ============================================
if (process.env.NODE_ENV === 'production') {
    const requiredVars = ['DATABASE_URL', 'JWT_SECRET', 'CORS_ORIGIN'];
    const missing = requiredVars.filter(v => !process.env[v]);
    if (missing.length > 0) {
        logger.error(`FATAL: Missing required environment variables: ${missing.join(', ')}`);
        process.exit(1);
    }

    // CORS wildcard is never acceptable in production
    if (process.env.CORS_ORIGIN === '*') {
        logger.error('FATAL: CORS_ORIGIN cannot be "*" in production. Set it to your actual domain(s).');
        process.exit(1);
    }

    // JWT secret must be strong (at least 32 chars, not a placeholder)
    const jwt = process.env.JWT_SECRET!;
    if (jwt.length < 32 || jwt.includes('change-me') || jwt.includes('your-') || jwt.includes('secret-here')) {
        logger.error('FATAL: JWT_SECRET is too weak or appears to be a placeholder. Generate with: openssl rand -base64 32');
        process.exit(1);
    }
}

const app: Application = express();

// Initialize Sentry for error monitoring
if (process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0, // 10% sampling in production
    });
    logger.info('✅ Sentry error monitoring initialized');
}
const httpServer = createServer(app);

// Parse allowed origins from environment
const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').map(o => o.trim()).filter(Boolean);

// Dynamic origin validation function
const corsOriginHandler = (origin: string | undefined, callback: (err: Error | null, allow?: boolean | string) => void) => {
    // Allow requests with no origin (mobile apps, server-to-server, curl)
    if (!origin) return callback(null, true);

    // In development, allow localhost origins
    if (process.env.NODE_ENV !== 'production') {
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
            return callback(null, origin);
        }
    }

    // Check if origin is in allowed list
    if (allowedOrigins.length > 0 && allowedOrigins.includes(origin)) {
        return callback(null, origin);
    }

    // If no origins configured in production, log warning and reject
    if (allowedOrigins.length === 0 && process.env.NODE_ENV === 'production') {
        logger.warn(`CORS: No CORS_ORIGIN configured. Rejecting origin: ${origin}`);
    }

    callback(new Error('CORS not allowed'), false);
};

// Socket.io setup for real-time features
const io = new SocketServer(httpServer, {
    cors: {
        origin: corsOriginHandler,
        methods: ['GET', 'POST'],
        credentials: true,
    },
    maxHttpBufferSize: 1e6, // 1MB max WebSocket payload
    pingTimeout: 30000,
    pingInterval: 25000,
});

// Middleware
app.use(helmet());
app.use(cors({
    origin: corsOriginHandler,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy for Railway/Heroku (must be before rate limiter)
app.set('trust proxy', 1);

// Rate limiting - 100 requests per minute per IP (production-safe)
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'), // 1 minute
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // 100 requests per IP
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false }
});
app.use(limiter);

// CSRF Protection: Reject state-changing requests without proper origin
app.use((req, res, next) => {
    // Only check state-changing methods
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        const origin = req.headers.origin;
        const referer = req.headers.referer;

        // Skip CSRF check for:
        // - Requests with no origin (mobile apps, server-to-server)
        // - Development environment
        // - API key authenticated requests (future)
        if (!origin && !referer) {
            return next(); // Mobile app or server-to-server
        }

        if (process.env.NODE_ENV !== 'production') {
            return next(); // Skip in development
        }

        // In production, verify origin matches allowed origins
        if (origin && allowedOrigins.length > 0 && !allowedOrigins.includes(origin)) {
            logger.warn(`CSRF: Blocked request from origin ${origin}`);
            return res.status(403).json({ error: 'Forbidden: Invalid origin' });
        }
    }
    next();
});

// Compress responses
app.use(compression());

// Enhanced health check with dependency probes
app.get('/health', async (_, res) => {
    const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {};
    const start = Date.now();

    // Database probe
    try {
        const dbStart = Date.now();
        const { prisma } = await import('./db/client.js');
        await prisma.$queryRaw`SELECT 1`;
        checks.database = { status: 'ok', latencyMs: Date.now() - dbStart };
    } catch (err: any) {
        checks.database = { status: 'error', error: err.message?.slice(0, 120) };
    }

    // Redis probe (optional — only if configured)
    if (process.env.REDIS_URL) {
        try {
            const redisStart = Date.now();
            const { cache } = await import('./services/cache/RedisCache.js');
            const isHealthy = await cache.healthCheck();
            checks.redis = { status: isHealthy ? 'ok' : 'unavailable', latencyMs: Date.now() - redisStart };
        } catch (err: any) {
            checks.redis = { status: 'unavailable', error: err.message?.slice(0, 120) };
        }
    }

    const overall = Object.values(checks).every((c) => c.status === 'ok') ? 'healthy' : 'degraded';
    const statusCode = checks.database?.status === 'ok' ? 200 : 503;

    res.status(statusCode).json({
        status: overall,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: Math.floor(process.uptime()),
        responseMs: Date.now() - start,
        checks,
    });
});

// Serve uploaded files statically (for local storage)
app.use('/uploads', express.static('uploads'));

// API routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/posts', postsRouter);
app.use('/api/v1/communities', communitiesRouter);
app.use('/api/v1/messages', messagesRouter);
app.use('/api/v1/moments', momentsRouter);
app.use('/api/v1/journeys', journeysRouter);
app.use('/api/v1/notifications', notificationsRouter);
app.use('/api/v1/livestream', livestreamRouter);
app.use('/api/v1/upload', uploadRouter);
app.use('/api/v1/admin/security', securityRouter);
app.use('/api/v1/community', communityRouter);
app.use('/api/v1/subscriptions', subscriptionRouter);
app.use('/api/v1/reports', reportRouter);
app.use('/api/v1/migration', migrationRouter);
app.use('/api/v1/topics', topicsRouter);
app.use('/api/v1/e2e', e2eRouter);
app.use('/api/v1/posts/scheduled', scheduleRouter);
app.use('/api/v1/users/preferences', preferencesRouter);
app.use('/api/v1/governance', governanceRouter);
app.use('/api/v1/push', pushRouter);
app.use('/api/v1/analytics', analyticsRouter);
app.use('/api/v1/search', searchRouter);
app.use('/api/v1/account/export', exportRouter);
app.use('/api/v1/invite', inviteRouter);
app.use('/api/v1/circles', circlesRouter);
app.use('/api/v1/developer', developerRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/campaigns', campaignsRouter);
app.use('/api/v1/creators', creatorsRouter);
app.use('/api/v1/growth', growthRouter);


// Sentry error handler (must be before custom error handler)
if (process.env.SENTRY_DSN) {
    Sentry.setupExpressErrorHandler(app);
}

// Error handler
app.use(errorHandler);

// Socket.io handlers
setupSocketHandlers(io);

// Initialize background services and start server
async function startServer() {
    // Initialize notification queue (BullMQ)
    initNotificationQueue();

    // Initialize scheduled post worker (async — must await before accepting requests)
    await initScheduleWorker();

    // Initialize growth partner qualification worker (daily job)
    await initGrowthQualificationWorker();

    // Start server
    const PORT = parseInt(process.env.PORT || '5180');
    const HOST = '0.0.0.0';

    httpServer.listen(PORT, HOST, () => {
        logger.info(`🚀 0G Server running on http://${HOST}:${PORT}`);
        logger.info(`📡 WebSocket server ready for real-time connections`);
        logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
}

startServer().catch((err) => {
    logger.error('Failed to start server:', err);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    await shutdownNotificationQueue();
    await shutdownScheduleWorker();
    await shutdownGrowthQualificationWorker();
    httpServer.close(() => {
        logger.info('Server closed');
        process.exit(0);
    });
});

export { app, io };

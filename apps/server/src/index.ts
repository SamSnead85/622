import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import dotenv from 'dotenv';

import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { postsRouter } from './routes/posts.js';
import { communitiesRouter } from './routes/communities.js';
import { messagesRouter } from './routes/messages.js';
import uploadRouter from './routes/upload.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';
import { setupSocketHandlers } from './socket/index.js';

// Load environment variables
dotenv.config();

const app: Application = express();
const httpServer = createServer(app);

// Socket.io setup for real-time features
const io = new SocketServer(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

// Health check
app.get('/health', (_, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
    });
});

// API routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/posts', postsRouter);
app.use('/api/v1/communities', communitiesRouter);
app.use('/api/v1/messages', messagesRouter);
app.use('/api/v1/upload', uploadRouter);

// Error handler
app.use(errorHandler);

// Socket.io handlers
setupSocketHandlers(io);

// Start server
const PORT = parseInt(process.env.PORT || '5180');

httpServer.listen(PORT, () => {
    logger.info(`🚀 Caravan Server running on port ${PORT}`);
    logger.info(`📡 WebSocket server ready for real-time connections`);
    logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    httpServer.close(() => {
        logger.info('Server closed');
        process.exit(0);
    });
});

export { app, io };

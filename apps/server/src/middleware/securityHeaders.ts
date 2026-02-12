import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

/**
 * Advanced Security Headers Middleware
 * Adds defense-in-depth headers beyond what Helmet provides.
 */
export function securityHeaders() {
    return (req: Request, res: Response, next: NextFunction) => {
        // Prevent MIME type sniffing
        res.setHeader('X-Content-Type-Options', 'nosniff');

        // Prevent clickjacking
        res.setHeader('X-Frame-Options', 'DENY');

        // XSS protection (legacy browsers)
        res.setHeader('X-XSS-Protection', '1; mode=block');

        // Prevent DNS prefetching to protect privacy
        res.setHeader('X-DNS-Prefetch-Control', 'off');

        // Disable client-side caching for API responses
        if (req.path.startsWith('/api/')) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }

        // Permissions Policy — restrict browser features
        res.setHeader('Permissions-Policy', 
            'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
        );

        // Referrer Policy — limit information leakage
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

        // Remove server identification headers
        res.removeHeader('X-Powered-By');

        next();
    };
}

/**
 * Request ID middleware for tracing
 * Assigns a unique ID to each request for audit trails
 */
export function requestId() {
    return (req: Request, res: Response, next: NextFunction) => {
        const id = req.headers['x-request-id'] as string || 
            `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        (req as any).requestId = id;
        res.setHeader('X-Request-ID', id);
        next();
    };
}

/**
 * Suspicious request detector
 * Blocks common attack patterns before they reach route handlers
 */
export function requestFirewall() {
    const BLOCKED_PATTERNS = [
        // Path traversal
        /\.\.\//,
        /\.\.\\/, 
        // SQL injection attempts
        /(\b(union|select|insert|update|delete|drop|alter|create|exec|execute)\b.*\b(from|into|table|database|schema)\b)/i,
        // Script injection
        /<script[\s>]/i,
        /javascript:/i,
        // Shell injection
        /[;&|`$]/,
        // Null bytes
        /\x00/,
        // Common exploit paths
        /\/(wp-admin|wp-login|xmlrpc|\.env|\.git|\.svn|phpmyadmin|admin\.php)/i,
    ];

    const BLOCKED_USER_AGENTS = [
        /sqlmap/i,
        /nikto/i,
        /nessus/i,
        /masscan/i,
        /zgrab/i,
        /gobuster/i,
        /dirbuster/i,
    ];

    return (req: Request, res: Response, next: NextFunction) => {
        const fullUrl = req.originalUrl || req.url;
        const userAgent = req.headers['user-agent'] || '';

        // Check URL for attack patterns (only on non-API paths to avoid false positives on content)
        if (!req.path.startsWith('/api/v1/posts') && !req.path.startsWith('/api/v1/messages')) {
            for (const pattern of BLOCKED_PATTERNS) {
                if (pattern.test(fullUrl)) {
                    logger.warn(`[FIREWALL] Blocked suspicious request: ${req.method} ${fullUrl} from ${req.ip}`);
                    return res.status(403).json({ error: 'Forbidden' });
                }
            }
        }

        // Check for scanner/attack tool user agents
        for (const pattern of BLOCKED_USER_AGENTS) {
            if (pattern.test(userAgent)) {
                logger.warn(`[FIREWALL] Blocked scanner: ${userAgent} from ${req.ip}`);
                return res.status(403).json({ error: 'Forbidden' });
            }
        }

        // Block requests with excessively long URLs (buffer overflow attempts)
        if (fullUrl.length > 2048) {
            logger.warn(`[FIREWALL] Blocked oversized URL (${fullUrl.length} chars) from ${req.ip}`);
            return res.status(414).json({ error: 'URI too long' });
        }

        // Block requests with suspicious headers
        const suspiciousHeaders = ['x-forwarded-host', 'x-original-url', 'x-rewrite-url'];
        for (const header of suspiciousHeaders) {
            if (req.headers[header] && req.path.startsWith('/api/')) {
                logger.warn(`[FIREWALL] Blocked request with suspicious header ${header} from ${req.ip}`);
                return res.status(403).json({ error: 'Forbidden' });
            }
        }

        next();
    };
}

/**
 * Environment Variable Validation
 * Run at server startup to ensure all required variables are set.
 * Warns about optional but recommended variables.
 */

import { logger } from './logger.js';

interface EnvVar {
    name: string;
    required: boolean;
    description: string;
}

const ENV_VARS: EnvVar[] = [
    // Database
    { name: 'DATABASE_URL', required: true, description: 'PostgreSQL connection string' },
    { name: 'DIRECT_URL', required: false, description: 'Direct database connection URL (bypasses pooler, used for migrations)' },
    
    // Authentication
    { name: 'JWT_SECRET', required: true, description: 'JWT signing secret (must be 32+ chars, generate with: openssl rand -base64 32)' },
    { name: 'JWT_EXPIRES_IN', required: false, description: 'JWT token lifetime (e.g. "7d", "24h")' },
    { name: 'GOOGLE_CLIENT_ID', required: false, description: 'Google OAuth client ID' },
    { name: 'APPLE_CLIENT_ID', required: false, description: 'Apple Sign-In client ID' },
    
    // Server Configuration
    { name: 'PORT', required: false, description: 'Server port (defaults to 5180)' },
    { name: 'NODE_ENV', required: false, description: 'Environment (production/development)' },
    { name: 'CORS_ORIGIN', required: true, description: 'Comma-separated allowed CORS origins (required in production)' },
    
    // URLs
    { name: 'SERVER_URL', required: false, description: 'Public-facing server URL (used for local file-storage URLs)' },
    { name: 'APP_URL', required: false, description: 'Public-facing app URL (used in invite links, referrals, email templates)' },
    { name: 'FRONTEND_URL', required: false, description: 'Frontend URL (used in email templates, defaults to APP_URL)' },
    { name: 'CLIENT_URL', required: false, description: 'Client URL (used for Stripe redirect URLs, defaults to APP_URL)' },
    { name: 'DOMAIN', required: false, description: 'Domain name for embed URLs (e.g. Twitch player parent param)' },
    
    // Redis
    { name: 'REDIS_URL', required: false, description: 'Redis connection URL for caching, real-time socket.io, and queues' },
    
    // Rate Limiting
    { name: 'RATE_LIMIT_WINDOW_MS', required: false, description: 'Rate limit window in milliseconds (defaults to 60000)' },
    { name: 'RATE_LIMIT_MAX_REQUESTS', required: false, description: 'Max requests per window (defaults to 100)' },
    
    // Storage Configuration
    { name: 'STORAGE_PROVIDER', required: false, description: 'Storage provider: local | supabase | s3 | r2 (defaults to local)' },
    { name: 'STORAGE_BUCKET', required: false, description: 'Storage bucket name (defaults to og-media)' },
    { name: 'UPLOAD_DIR', required: false, description: 'Local upload directory (only used when STORAGE_PROVIDER=local)' },
    
    // Supabase Storage
    { name: 'SUPABASE_URL', required: false, description: 'Supabase project URL (required when STORAGE_PROVIDER=supabase)' },
    { name: 'SUPABASE_SERVICE_KEY', required: false, description: 'Supabase service role key (required when STORAGE_PROVIDER=supabase)' },
    
    // AWS S3 Storage
    { name: 'AWS_ACCESS_KEY_ID', required: false, description: 'AWS access key ID (required when STORAGE_PROVIDER=s3)' },
    { name: 'AWS_SECRET_ACCESS_KEY', required: false, description: 'AWS secret access key (required when STORAGE_PROVIDER=s3)' },
    { name: 'AWS_REGION', required: false, description: 'AWS region (defaults to us-east-1)' },
    
    // Cloudflare R2 Storage
    { name: 'R2_ACCESS_KEY_ID', required: false, description: 'R2 access key ID (required when STORAGE_PROVIDER=r2)' },
    { name: 'R2_SECRET_ACCESS_KEY', required: false, description: 'R2 secret access key (required when STORAGE_PROVIDER=r2)' },
    { name: 'R2_ENDPOINT', required: false, description: 'R2 endpoint URL (required when STORAGE_PROVIDER=r2)' },
    { name: 'R2_PUBLIC_URL', required: false, description: 'R2 public CDN URL' },
    
    // Cloudinary
    { name: 'CLOUDINARY_CLOUD_NAME', required: false, description: 'Cloudinary cloud name for media storage' },
    { name: 'CLOUDINARY_API_KEY', required: false, description: 'Cloudinary API key' },
    { name: 'CLOUDINARY_API_SECRET', required: false, description: 'Cloudinary API secret' },
    
    // CDN / Signed URLs
    { name: 'URL_SIGNING_SECRET', required: false, description: 'Secret for signing media URLs (auto-generated if not set)' },
    { name: 'CDN_URL', required: false, description: 'CDN base URL for public media' },
    { name: 'STORAGE_URL', required: false, description: 'Upload endpoint for signed upload URLs' },
    
    // Email
    { name: 'RESEND_API_KEY', required: false, description: 'Resend API key for email delivery' },
    { name: 'EMAIL_FROM', required: false, description: 'Default sender email address (defaults to noreply@0gravity.ai)' },
    { name: 'EMAIL_FROM_NAME', required: false, description: 'Default sender name (defaults to 0G Platform)' },
    
    // Payments - Stripe
    { name: 'STRIPE_SECRET_KEY', required: false, description: 'Stripe secret key for payments' },
    { name: 'STRIPE_WEBHOOK_SECRET', required: false, description: 'Stripe webhook signing secret' },
    
    // Push Notifications
    { name: 'VAPID_PUBLIC_KEY', required: false, description: 'VAPID public key for web push notifications' },
    { name: 'VAPID_PRIVATE_KEY', required: false, description: 'VAPID private key for web push notifications' },
    
    // Error Monitoring
    { name: 'SENTRY_DSN', required: false, description: 'Sentry DSN for error tracking' },
    
    // Security / Encryption
    { name: 'ENCRYPTION_KEY', required: false, description: 'Encryption key for 2FA and sensitive data (hex, 64 chars / 32 bytes, generate with: openssl rand -hex 32)' },
    
    // Live Streaming
    { name: 'MUX_TOKEN_ID', required: false, description: 'Mux token ID for live streaming' },
    { name: 'MUX_TOKEN_SECRET', required: false, description: 'Mux token secret for live streaming' },
    { name: 'MUX_WEBHOOK_SECRET', required: false, description: 'Mux webhook signing secret' },
    
    // Logging
    { name: 'LOG_LEVEL', required: false, description: 'Log level: error | warn | info | http | verbose | debug | silly (defaults to info)' },
];

/**
 * Validate environment variables and log results
 * Returns true if all required variables are set
 */
export function validateEnvironment(): boolean {
    const missing: string[] = [];
    const warnings: string[] = [];

    // Check required variables
    for (const envVar of ENV_VARS) {
        const value = process.env[envVar.name];
        
        if (!value || value.trim() === '') {
            if (envVar.required) {
                missing.push(`  ❌ ${envVar.name} — ${envVar.description}`);
            } else {
                // Only warn about optional variables in production
                if (process.env.NODE_ENV === 'production') {
                    warnings.push(`  ⚠️  ${envVar.name} — ${envVar.description}`);
                }
            }
        }
    }

    // Check for placeholder values
    const placeholderPatterns = ['YOUR_', 'PLACEHOLDER', 'xxx', 'changeme', 'todo', 'REPLACE_WITH', 'your-', 'secret-here', 'change-me'];
    for (const envVar of ENV_VARS) {
        const value = process.env[envVar.name];
        if (value && placeholderPatterns.some(p => value.toUpperCase().includes(p.toUpperCase()))) {
            warnings.push(`  ⚠️  ${envVar.name} appears to contain a placeholder value`);
        }
    }

    // Additional validation for critical variables
    if (process.env.NODE_ENV === 'production') {
        // JWT_SECRET strength check
        const jwt = process.env.JWT_SECRET;
        if (jwt && (jwt.length < 32 || jwt.includes('change-me') || jwt.includes('your-') || jwt.includes('secret-here'))) {
            warnings.push(`  ⚠️  JWT_SECRET is too weak or appears to be a placeholder. Generate with: openssl rand -base64 32`);
        }

        // CORS_ORIGIN wildcard check
        if (process.env.CORS_ORIGIN === '*') {
            warnings.push(`  ⚠️  CORS_ORIGIN cannot be "*" in production. Set it to your actual domain(s).`);
        }

        // Storage provider validation
        const storageProvider = process.env.STORAGE_PROVIDER || 'local';
        if (storageProvider === 'supabase') {
            if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
                warnings.push(`  ⚠️  STORAGE_PROVIDER is set to "supabase" but SUPABASE_URL or SUPABASE_SERVICE_KEY is missing`);
            }
        } else if (storageProvider === 's3') {
            if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
                warnings.push(`  ⚠️  STORAGE_PROVIDER is set to "s3" but AWS credentials are missing`);
            }
        } else if (storageProvider === 'r2') {
            if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_ENDPOINT) {
                warnings.push(`  ⚠️  STORAGE_PROVIDER is set to "r2" but R2 credentials are missing`);
            }
        }

        // Redis warning (optional but recommended)
        if (!process.env.REDIS_URL) {
            warnings.push(`  ⚠️  REDIS_URL is not set. Socket.IO will run in memory-only mode (no horizontal scaling).`);
        }
    }

    // Log results
    if (missing.length > 0) {
        logger.error('=== MISSING REQUIRED ENVIRONMENT VARIABLES ===');
        missing.forEach(m => logger.error(m));
        logger.error('');
    }

    if (warnings.length > 0) {
        logger.warn('=== ENVIRONMENT VARIABLE WARNINGS ===');
        warnings.forEach(w => logger.warn(w));
        logger.warn('');
    }

    if (missing.length === 0 && warnings.length === 0) {
        logger.info('✅ All required environment variables are set');
    } else if (missing.length === 0) {
        logger.info('✅ All required environment variables are set (some optional variables are missing)');
    }

    return missing.length === 0;
}

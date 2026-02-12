/**
 * Sentry Error Tracking for Web App
 * Initializes client-side error monitoring in production.
 */

let isInitialized = false;

interface SentryConfig {
    dsn: string;
    environment: string;
    release?: string;
}

// Lightweight Sentry-compatible error reporter
// Uses the Sentry HTTP API directly to avoid heavy SDK dependency
class ErrorReporter {
    private dsn: string;
    private environment: string;
    private release: string;

    constructor(config: SentryConfig) {
        this.dsn = config.dsn;
        this.environment = config.environment;
        this.release = config.release || '1.0.0';
    }

    captureException(error: Error, context?: Record<string, any>) {
        if (typeof window === 'undefined') return;

        const payload = {
            exception: {
                values: [{
                    type: error.name,
                    value: error.message,
                    stacktrace: error.stack ? { frames: this.parseStack(error.stack) } : undefined,
                }],
            },
            environment: this.environment,
            release: this.release,
            platform: 'javascript',
            timestamp: Date.now() / 1000,
            tags: {
                url: window.location.href,
                userAgent: navigator.userAgent,
                ...context?.tags,
            },
            extra: context?.extra,
        };

        // Parse DSN to get project ID and key
        try {
            const url = new URL(this.dsn);
            const projectId = url.pathname.replace('/', '');
            const publicKey = url.username;
            const host = url.hostname;

            const endpoint = `https://${host}/api/${projectId}/store/?sentry_version=7&sentry_key=${publicKey}`;

            // Fire and forget — don't block the UI
            fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            }).catch(() => {
                // Silently fail — error reporting should never cause errors
            });
        } catch {
            // Invalid DSN — skip
        }
    }

    captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
        this.captureException(new Error(message), { tags: { level } });
    }

    private parseStack(stack: string) {
        return stack.split('\n').slice(1).map(line => {
            const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
            if (match) {
                return {
                    function: match[1],
                    filename: match[2],
                    lineno: parseInt(match[3]),
                    colno: parseInt(match[4]),
                };
            }
            return { function: line.trim(), filename: 'unknown', lineno: 0, colno: 0 };
        });
    }
}

let reporter: ErrorReporter | null = null;

/**
 * Initialize Sentry error tracking
 * Call this once in the app root (e.g., providers.tsx or layout.tsx)
 */
export function initSentry() {
    if (isInitialized || typeof window === 'undefined') return;

    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    if (!dsn) {
        console.warn('[Sentry] NEXT_PUBLIC_SENTRY_DSN not set — error tracking disabled');
        return;
    }

    reporter = new ErrorReporter({
        dsn,
        environment: process.env.NODE_ENV || 'development',
        release: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    });

    // Global error handler
    window.addEventListener('error', (event) => {
        if (event.error) {
            reporter?.captureException(event.error);
        }
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
        if (event.reason instanceof Error) {
            reporter?.captureException(event.reason);
        } else {
            reporter?.captureMessage(`Unhandled rejection: ${String(event.reason)}`, 'error');
        }
    });

    isInitialized = true;
}

/**
 * Manually report an error to Sentry
 */
export function captureException(error: Error, context?: Record<string, any>) {
    reporter?.captureException(error, context);
}

/**
 * Manually report a message to Sentry
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
    reporter?.captureMessage(message, level);
}

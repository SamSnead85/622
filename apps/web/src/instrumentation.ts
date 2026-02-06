// Sentry instrumentation - install @sentry/nextjs to enable
// npm install @sentry/nextjs --workspace=apps/web
export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        // Server-side Sentry initialization would go here
    }

    if (process.env.NEXT_RUNTIME === 'edge') {
        // Edge runtime Sentry initialization would go here
    }
}

/**
 * THREAT ALERTING SERVICE
 * Sends real-time notifications to admins when security events occur.
 *
 * Supports:
 * - Slack/Discord webhook
 * - Email alerts (via existing email service)
 * - In-app admin notifications
 *
 * Severity levels:
 * - LOW: batched (logged only)
 * - MEDIUM: immediate webhook
 * - HIGH: immediate webhook + email
 * - CRITICAL: immediate webhook + email + in-app notification to all admins
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

const prisma = new PrismaClient();

export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AlertPayload {
    severity: AlertSeverity;
    eventType: string;
    message: string;
    details?: Record<string, unknown>;
    ip?: string;
    userId?: string;
}

/**
 * Send a threat alert through configured channels.
 */
export async function sendAlert(payload: AlertPayload): Promise<void> {
    const { severity, eventType, message, details, ip, userId } = payload;

    // Always log
    const logPrefix = severity === 'CRITICAL' ? 'CRITICAL' :
                      severity === 'HIGH' ? 'HIGH' :
                      severity === 'MEDIUM' ? 'MEDIUM' : 'LOW';
    logger.warn(`[ALERT:${logPrefix}] ${eventType}: ${message}`, { details, ip, userId });

    // LOW severity: log only
    if (severity === 'LOW') return;

    // MEDIUM+: Send webhook
    if (severity === 'MEDIUM' || severity === 'HIGH' || severity === 'CRITICAL') {
        await sendWebhook(payload).catch(err =>
            logger.error('[Alerting] Webhook failed:', err)
        );
    }

    // HIGH+: Send email to admin
    if (severity === 'HIGH' || severity === 'CRITICAL') {
        await sendAdminEmail(payload).catch(err =>
            logger.error('[Alerting] Email alert failed:', err)
        );
    }

    // CRITICAL: Create in-app notifications for all admins
    if (severity === 'CRITICAL') {
        await notifyAdmins(payload).catch(err =>
            logger.error('[Alerting] Admin notification failed:', err)
        );
    }
}

/**
 * Send alert to Slack/Discord webhook
 */
async function sendWebhook(payload: AlertPayload): Promise<void> {
    const webhookUrl = process.env.ALERT_WEBHOOK_URL;
    if (!webhookUrl) {
        logger.debug('[Alerting] No ALERT_WEBHOOK_URL configured, skipping webhook');
        return;
    }

    const severityEmoji: Record<AlertSeverity, string> = {
        LOW: 'information_source',
        MEDIUM: 'warning',
        HIGH: 'rotating_light',
        CRITICAL: 'skull',
    };

    const body = {
        // Slack-compatible format (also works with Discord via /slack endpoint)
        text: `:${severityEmoji[payload.severity]}: *[${payload.severity}] ${payload.eventType}*\n${payload.message}`,
        blocks: [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `:${severityEmoji[payload.severity]}: *[${payload.severity}] ${payload.eventType}*\n${payload.message}`,
                },
            },
            ...(payload.details ? [{
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `\`\`\`${JSON.stringify(payload.details, null, 2).substring(0, 500)}\`\`\``,
                },
            }] : []),
            ...(payload.ip ? [{
                type: 'context',
                elements: [{
                    type: 'mrkdwn',
                    text: `IP: \`${payload.ip}\`${payload.userId ? ` | User: \`${payload.userId}\`` : ''}`,
                }],
            }] : []),
        ],
    };

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            logger.error(`[Alerting] Webhook returned ${response.status}: ${await response.text()}`);
        }
    } catch (error) {
        logger.error('[Alerting] Webhook request failed:', error);
    }
}

/**
 * Send email alert to configured admin email
 */
async function sendAdminEmail(payload: AlertPayload): Promise<void> {
    const adminEmail = process.env.ALERT_EMAIL;
    if (!adminEmail) {
        logger.debug('[Alerting] No ALERT_EMAIL configured, skipping email alert');
        return;
    }

    // Use Resend if available
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
        logger.debug('[Alerting] No RESEND_API_KEY configured, skipping email alert');
        return;
    }

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${resendKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: 'security@0g.social',
                to: adminEmail,
                subject: `[0G Security ${payload.severity}] ${payload.eventType}`,
                text: [
                    `Severity: ${payload.severity}`,
                    `Event: ${payload.eventType}`,
                    `Message: ${payload.message}`,
                    payload.ip ? `IP: ${payload.ip}` : '',
                    payload.userId ? `User ID: ${payload.userId}` : '',
                    payload.details ? `\nDetails:\n${JSON.stringify(payload.details, null, 2)}` : '',
                ].filter(Boolean).join('\n'),
            }),
        });

        if (!response.ok) {
            logger.error(`[Alerting] Resend email returned ${response.status}`);
        }
    } catch (error) {
        logger.error('[Alerting] Email send failed:', error);
    }
}

/**
 * Create in-app notifications for all admin users
 */
async function notifyAdmins(payload: AlertPayload): Promise<void> {
    try {
        const admins = await prisma.user.findMany({
            where: { role: { in: ['ADMIN', 'SUPERADMIN'] } },
            select: { id: true },
        });

        if (admins.length === 0) return;

        await prisma.notification.createMany({
            data: admins.map(admin => ({
                userId: admin.id,
                type: 'SYSTEM' as const,
                message: `[Security ${payload.severity}] ${payload.eventType}: ${payload.message}`,
            })),
        });
    } catch (error) {
        logger.error('[Alerting] Admin notification creation failed:', error);
    }
}

export default {
    sendAlert,
};

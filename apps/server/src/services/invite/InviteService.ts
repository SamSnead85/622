import { PrismaClient, InviteStatus, InviteMethod } from '@prisma/client';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

// Email configuration (uses Resend SDK when RESEND_API_KEY is set)
interface EmailConfig {
    to: string;
    subject: string;
    html: string;
}

export interface InviteResult {
    inviteId: string;
    method: InviteMethod;
    status: 'sent' | 'failed';
    error?: string;
}

export interface BulkInviteResult {
    sent: number;
    failed: number;
    results: InviteResult[];
}

export class InviteService {
    private static RATE_LIMIT_PER_DAY = 50;

    /**
     * Generate a unique referral code
     */
    private generateReferralCode(): string {
        return randomBytes(6).toString('hex').toUpperCase();
    }

    /**
     * Check if user has exceeded daily invite limit
     */
    private async checkRateLimit(userId: string): Promise<boolean> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const count = await prisma.invite.count({
            where: {
                senderId: userId,
                createdAt: { gte: today },
            },
        });

        return count < InviteService.RATE_LIMIT_PER_DAY;
    }

    /**
     * Get remaining invites for today
     */
    async getRemainingInvites(userId: string): Promise<number> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const count = await prisma.invite.count({
            where: {
                senderId: userId,
                createdAt: { gte: today },
            },
        });

        return Math.max(0, InviteService.RATE_LIMIT_PER_DAY - count);
    }

    /**
     * Create and send an email invite
     */
    async sendEmailInvite(
        senderId: string,
        recipientEmail: string,
        customMessage?: string
    ): Promise<InviteResult> {
        // Check rate limit
        if (!(await this.checkRateLimit(senderId))) {
            return {
                inviteId: '',
                method: 'EMAIL',
                status: 'failed',
                error: 'Daily invite limit reached',
            };
        }

        // Get sender info
        const sender = await prisma.user.findUnique({
            where: { id: senderId },
        });

        if (!sender) {
            return {
                inviteId: '',
                method: 'EMAIL',
                status: 'failed',
                error: 'Sender not found',
            };
        }

        // Generate referral code
        const referralCode = this.generateReferralCode();

        // Create invite record
        const invite = await prisma.invite.create({
            data: {
                senderId,
                recipientEmail,
                method: 'EMAIL',
                status: 'SENT',
                referralCode,
                message: customMessage,
            },
        });

        // Send email via Resend (or log warning if not configured)
        try {
            await this.sendEmail({
                to: recipientEmail,
                subject: `${sender.displayName} invited you to join 0G`,
                html: this.generateInviteEmailHtml(sender.displayName, referralCode, customMessage),
            });

            return {
                inviteId: invite.id,
                method: 'EMAIL',
                status: 'sent',
            };
        } catch (error) {
            // Update invite status to failed
            await prisma.invite.update({
                where: { id: invite.id },
                data: { status: 'BOUNCED' },
            });

            return {
                inviteId: invite.id,
                method: 'EMAIL',
                status: 'failed',
                error: error instanceof Error ? error.message : 'Failed to send email',
            };
        }
    }

    /**
     * Create a shareable invite link
     */
    async createInviteLink(senderId: string): Promise<{ code: string; url: string }> {
        const referralCode = this.generateReferralCode();

        await prisma.invite.create({
            data: {
                senderId,
                method: 'LINK',
                status: 'SENT',
                referralCode,
            },
        });

        // In production, use actual domain
        const baseUrl = process.env.APP_URL || 'https://0gravity.ai';
        const url = `${baseUrl}/join?ref=${referralCode}`;

        return { code: referralCode, url };
    }

    /**
     * Send bulk invites to pending connections
     */
    async sendBulkInvites(
        senderId: string,
        pendingConnectionIds: string[],
        customMessage?: string
    ): Promise<BulkInviteResult> {
        const results: InviteResult[] = [];
        let sent = 0;
        let failed = 0;

        // Get pending connections with email
        const connections = await prisma.pendingConnection.findMany({
            where: {
                id: { in: pendingConnectionIds },
                userId: senderId,
                email: { not: null },
                inviteStatus: 'NOT_SENT',
            },
        });

        for (const connection of connections) {
            if (!connection.email) continue;

            const result = await this.sendEmailInvite(
                senderId,
                connection.email,
                customMessage
            );

            if (result.status === 'sent') {
                sent++;
                // Update pending connection status
                await prisma.pendingConnection.update({
                    where: { id: connection.id },
                    data: {
                        inviteStatus: 'SENT',
                        inviteMethod: 'EMAIL',
                        inviteSentAt: new Date(),
                    },
                });
            } else {
                failed++;
            }

            results.push(result);
        }

        return { sent, failed, results };
    }

    /**
     * Handle when someone joins via referral code
     */
    async handleReferralJoin(referralCode: string, newUserId: string): Promise<boolean> {
        const invite = await prisma.invite.findUnique({
            where: { referralCode },
        });

        if (!invite) return false;

        // Update invite with joined user
        await prisma.invite.update({
            where: { id: invite.id },
            data: {
                status: 'JOINED',
                joinedAt: new Date(),
                joinedUserId: newUserId,
            },
        });

        // Update any pending connections that match
        if (invite.recipientEmail) {
            await prisma.pendingConnection.updateMany({
                where: {
                    email: invite.recipientEmail,
                    inviteStatus: { in: ['SENT', 'REMINDED'] },
                },
                data: {
                    inviteStatus: 'JOINED',
                    matchedUserId: newUserId,
                },
            });
        }

        // Auto-follow the inviter
        await prisma.follow.create({
            data: {
                followerId: newUserId,
                followingId: invite.senderId,
            },
        }).catch(() => {
            // Ignore duplicate follow errors
        });

        return true;
    }

    /**
     * Track when an invite is opened (via email tracking pixel or link click)
     */
    async trackInviteOpened(referralCode: string): Promise<void> {
        await prisma.invite.updateMany({
            where: {
                referralCode,
                openedAt: null,
            },
            data: {
                status: 'OPENED',
                openedAt: new Date(),
            },
        });
    }

    /**
     * Get user's sent invites with status
     */
    async getUserInvites(userId: string) {
        return prisma.invite.findMany({
            where: { senderId: userId },
            orderBy: { createdAt: 'desc' },
            include: {
                joinedUser: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                    },
                },
            },
        });
    }

    /**
     * Generate invite email HTML
     */
    private generateInviteEmailHtml(
        senderName: string,
        referralCode: string,
        customMessage?: string
    ): string {
        const joinUrl = `${process.env.APP_URL || 'https://0gravity.ai'}/join?ref=${referralCode}`;

        return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
  
  <div style="text-align: center; margin-bottom: 32px;">
    <div style="display: inline-block; width: 48px; height: 48px; background: #000; color: #fff; border-radius: 12px; line-height: 48px; font-weight: bold; font-size: 20px;">C</div>
  </div>

  <h1 style="font-size: 24px; font-weight: 600; margin: 0 0 16px;">
    ${senderName} invited you to join 0G
  </h1>

  ${customMessage ? `<p style="color: #666; margin: 0 0 24px;">"${customMessage}"</p>` : ''}

  <p style="margin: 0 0 24px;">
    0G is a new social platform that's:
  </p>

  <ul style="margin: 0 0 24px; padding-left: 24px; color: #333;">
    <li style="margin-bottom: 8px;"><strong>Completely free</strong> — no hidden fees, no coins, no manipulation</li>
    <li style="margin-bottom: 8px;"><strong>Privacy-first</strong> — you control your data</li>
    <li style="margin-bottom: 8px;"><strong>Community-focused</strong> — built for real connections</li>
  </ul>

  <p style="margin: 0 0 32px;">
    Your friend is already there and wants to stay connected with you. Join to pick up where you left off.
  </p>

  <a href="${joinUrl}" style="display: inline-block; background: #000; color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
    Join 0G Free →
  </a>

  <p style="margin: 40px 0 0; font-size: 13px; color: #999;">
    This is the only email we'll send. No spam, ever.<br>
    <a href="${joinUrl}" style="color: #666;">${joinUrl}</a>
  </p>

</body>
</html>
    `.trim();
    }

    /**
     * Send an email via Resend when configured, otherwise log a warning.
     * Resend is dynamically imported so the service works without the SDK
     * when RESEND_API_KEY is not set.
     */
    private async sendEmail(config: EmailConfig): Promise<void> {
        if (!process.env.RESEND_API_KEY) {
            console.warn(
                '[InviteService] ⚠️ RESEND_API_KEY is not configured — invite email will NOT be delivered.',
            );
            console.log(`[InviteService] Would have sent to: ${config.to}`);
            console.log(`[InviteService] Subject: ${config.subject}`);
            return;
        }

        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);

        const fromEmail = process.env.EMAIL_FROM || 'noreply@0gravity.ai';
        const fromName = process.env.EMAIL_FROM_NAME || '0G Platform';

        await resend.emails.send({
            from: `${fromName} <${fromEmail}>`,
            to: config.to,
            subject: config.subject,
            html: config.html,
        });

        console.log(`[InviteService] Email sent to ${config.to}`);
    }
}

export const inviteService = new InviteService();

import { Resend } from 'resend';

// ============================================
// EMAIL SERVICE
// Using Resend for transactional emails
// ============================================

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.FROM_EMAIL || '0G <noreply@0gravity.ai>';
const APP_NAME = '0G';
const APP_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://0gravity.ai';

// ============================================
// EMAIL TEMPLATES
// ============================================

interface EmailResult {
    success: boolean;
    id?: string;
    error?: string;
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
    email: string,
    resetToken: string
): Promise<EmailResult> {
    const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`;

    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: email,
            subject: 'Reset Your Password - Six22',
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                    <div style="text-align: center; margin-bottom: 32px;">
                        <h1 style="color: #1a1a2e; font-size: 28px; margin: 0;">⚡ ${APP_NAME}</h1>
                    </div>
                    <h2 style="color: #1a1a2e; font-size: 24px;">Reset Your Password</h2>
                    <p style="color: #4a4a68; font-size: 16px; line-height: 1.6;">
                        We received a request to reset your password. Click the button below to choose a new one.
                    </p>
                    <div style="text-align: center; margin: 32px 0;">
                        <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #f97316, #ec4899, #8b5cf6); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                            Reset Password
                        </a>
                    </div>
                    <p style="color: #6b6b8a; font-size: 14px;">
                        This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
                    </p>
                    <hr style="border: none; border-top: 1px solid #e5e5ea; margin: 32px 0;" />
                    <p style="color: #8b8ba3; font-size: 12px; text-align: center;">
                        ${APP_NAME} - Your Family, Your Friends, Your Rules
                    </p>
                </div>
            `,
        });

        if (error) {
            console.error('Email send error:', error);
            return { success: false, error: error.message };
        }

        return { success: true, id: data?.id };
    } catch (error) {
        console.error('Email service error:', error);
        return { success: false, error: 'Failed to send email' };
    }
}

/**
 * Send invite email to join Caravan
 */
export async function sendInviteEmail(
    email: string,
    senderName: string,
    referralCode: string,
    customMessage?: string
): Promise<EmailResult> {
    const joinUrl = `${APP_URL}/signup?ref=${referralCode}`;

    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: email,
            subject: `${senderName} invited you to join Six22`,
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                    <div style="text-align: center; margin-bottom: 32px;">
                        <h1 style="color: #1a1a2e; font-size: 28px; margin: 0;">⚡ ${APP_NAME}</h1>
                    </div>
                    <h2 style="color: #1a1a2e; font-size: 24px;">You're Invited!</h2>
                    <p style="color: #4a4a68; font-size: 16px; line-height: 1.6;">
                        <strong>${senderName}</strong> wants you to join them on Six22 - the social platform where you own your data and control your algorithm.
                    </p>
                    ${customMessage ? `
                        <div style="background: #f5f5f7; border-radius: 8px; padding: 16px; margin: 24px 0;">
                            <p style="color: #4a4a68; font-size: 14px; font-style: italic; margin: 0;">
                                "${customMessage}"
                            </p>
                            <p style="color: #8b8ba3; font-size: 12px; margin: 8px 0 0 0;">— ${senderName}</p>
                        </div>
                    ` : ''}
                    <div style="text-align: center; margin: 32px 0;">
                        <a href="${joinUrl}" style="display: inline-block; background: linear-gradient(135deg, #f97316, #ec4899, #8b5cf6); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                            Join Six22
                        </a>
                    </div>
                    <p style="color: #6b6b8a; font-size: 14px;">
                        It's free and takes less than a minute to sign up.
                    </p>
                    <hr style="border: none; border-top: 1px solid #e5e5ea; margin: 32px 0;" />
                    <p style="color: #8b8ba3; font-size: 12px; text-align: center;">
                        ${APP_NAME} - Your Family, Your Friends, Your Rules
                    </p>
                </div>
            `,
        });

        if (error) {
            console.error('Invite email error:', error);
            return { success: false, error: error.message };
        }

        return { success: true, id: data?.id };
    } catch (error) {
        console.error('Email service error:', error);
        return { success: false, error: 'Failed to send invite' };
    }
}

/**
 * Send welcome email after signup
 */
export async function sendWelcomeEmail(
    email: string,
    displayName: string
): Promise<EmailResult> {
    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: email,
            subject: `Welcome to Caravan, ${displayName}! 🐪`,
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                    <div style="text-align: center; margin-bottom: 32px;">
                        <h1 style="color: #1a1a2e; font-size: 28px; margin: 0;">⚡ ${APP_NAME}</h1>
                    </div>
                    <h2 style="color: #1a1a2e; font-size: 24px;">Welcome to the journey, ${displayName}!</h2>
                    <p style="color: #4a4a68; font-size: 16px; line-height: 1.6;">
                        You've joined a community where <strong>you own your algorithm</strong>. No more being fed content you didn't ask for.
                    </p>
                    <div style="background: linear-gradient(135deg, #1a1a2e, #2d2d44); border-radius: 12px; padding: 24px; margin: 24px 0;">
                        <h3 style="color: white; margin: 0 0 16px 0;">Get Started:</h3>
                        <ul style="color: #d1d1e0; margin: 0; padding-left: 20px; line-height: 1.8;">
                            <li>Complete your profile with a photo</li>
                            <li>Find and follow your friends</li>
                            <li>Import your content from other platforms</li>
                            <li>Share your first moment</li>
                        </ul>
                    </div>
                    <div style="text-align: center; margin: 32px 0;">
                        <a href="${APP_URL}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #f97316, #ec4899, #8b5cf6); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                            Open Six22
                        </a>
                    </div>
                    <hr style="border: none; border-top: 1px solid #e5e5ea; margin: 32px 0;" />
                    <p style="color: #8b8ba3; font-size: 12px; text-align: center;">
                        ${APP_NAME} - Your Family, Your Friends, Your Rules
                    </p>
                </div>
            `,
        });

        if (error) {
            console.error('Welcome email error:', error);
            return { success: false, error: error.message };
        }

        return { success: true, id: data?.id };
    } catch (error) {
        console.error('Email service error:', error);
        return { success: false, error: 'Failed to send welcome email' };
    }
}

/**
 * Send notification email (new follower, mention, etc.)
 */
export async function sendNotificationEmail(
    email: string,
    subject: string,
    previewText: string,
    body: string,
    ctaText?: string,
    ctaUrl?: string
): Promise<EmailResult> {
    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: email,
            subject,
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                    <div style="text-align: center; margin-bottom: 32px;">
                        <h1 style="color: #1a1a2e; font-size: 28px; margin: 0;">⚡ ${APP_NAME}</h1>
                    </div>
                    <p style="color: #4a4a68; font-size: 16px; line-height: 1.6;">
                        ${body}
                    </p>
                    ${ctaText && ctaUrl ? `
                        <div style="text-align: center; margin: 32px 0;">
                            <a href="${ctaUrl}" style="display: inline-block; background: #1a1a2e; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; font-size: 14px;">
                                ${ctaText}
                            </a>
                        </div>
                    ` : ''}
                    <hr style="border: none; border-top: 1px solid #e5e5ea; margin: 32px 0;" />
                    <p style="color: #8b8ba3; font-size: 12px; text-align: center;">
                        <a href="${APP_URL}/settings" style="color: #8b8ba3;">Manage notification preferences</a>
                    </p>
                </div>
            `,
        });

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, id: data?.id };
    } catch (error) {
        return { success: false, error: 'Failed to send notification' };
    }
}

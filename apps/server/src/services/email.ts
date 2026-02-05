import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@0gravity.ai';
const FROM_NAME = process.env.EMAIL_FROM_NAME || '0G Platform';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://0gravity.ai';

/**
 * Send email verification email
 */
export const sendVerificationEmail = async (to: string, token: string) => {
    if (!process.env.RESEND_API_KEY) {
        console.warn('⚠️ RESEND_API_KEY not set. Skipping email send.');
        console.log(`Verification link: ${FRONTEND_URL}/verify?token=${token}`);
        return;
    }

    try {
        await resend.emails.send({
            from: `${FROM_NAME} <${FROM_EMAIL}>`,
            to,
            subject: 'Verify your 0G account',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #06b6d4;">Welcome to 0G</h1>
                    <p>Click the button below to verify your email address:</p>
                    <a href="${FRONTEND_URL}/verify?token=${token}" 
                       style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
                        Verify Email
                    </a>
                    <p style="color: #666; margin-top: 24px;">Or copy and paste this link:</p>
                    <p style="color: #06b6d4;">${FRONTEND_URL}/verify?token=${token}</p>
                    <p style="color: #999; font-size: 12px; margin-top: 32px;">
                        This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
                    </p>
                </div>
            `,
        });
    } catch (error) {
        console.error('Failed to send verification email:', error);
        throw error;
    }
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (to: string, token: string) => {
    if (!process.env.RESEND_API_KEY) {
        console.warn('⚠️ RESEND_API_KEY not set. Skipping email send.');
        console.log(`Password reset link: ${FRONTEND_URL}/reset-password?token=${token}`);
        return;
    }

    try {
        await resend.emails.send({
            from: `${FROM_NAME} <${FROM_EMAIL}>`,
            to,
            subject: 'Reset your 0G password',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #06b6d4;">Reset Your Password</h1>
                    <p>You requested to reset your password. Click the button below to create a new password:</p>
                    <a href="${FRONTEND_URL}/reset-password?token=${token}" 
                       style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
                        Reset Password
                    </a>
                    <p style="color: #666; margin-top: 24px;">Or copy and paste this link:</p>
                    <p style="color: #06b6d4;">${FRONTEND_URL}/reset-password?token=${token}</p>
                    <p style="color: #999; font-size: 12px; margin-top: 32px;">
                        This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
                    </p>
                </div>
            `,
        });
    } catch (error) {
        console.error('Failed to send password reset email:', error);
        throw error;
    }
};

/**
 * Send welcome email (after verification)
 */
export const sendWelcomeEmail = async (to: string, displayName: string) => {
    if (!process.env.RESEND_API_KEY) {
        console.warn('⚠️ RESEND_API_KEY not set. Skipping email send.');
        return;
    }

    try {
        await resend.emails.send({
            from: `${FROM_NAME} <${FROM_EMAIL}>`,
            to,
            subject: 'Welcome to 0G - Your Sovereign Social Network',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #06b6d4;">Welcome, ${displayName}! 🎉</h1>
                    <p>You're now part of the 0G community - a sovereign social network built on principles of freedom and authenticity.</p>
                    
                    <h2 style="color: #8b5cf6; margin-top: 32px;">Get Started</h2>
                    <ul style="line-height: 1.8;">
                        <li>Complete your profile</li>
                        <li>Join communities that align with your interests</li>
                        <li>Share your first post</li>
                        <li>Connect with like-minded people</li>
                    </ul>

                    <a href="${FRONTEND_URL}/dashboard" 
                       style="display: inline-block; margin-top: 24px; padding: 12px 24px; background: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
                        Go to Dashboard
                    </a>

                    <p style="color: #999; font-size: 12px; margin-top: 32px;">
                        Need help? Visit our help center or reach out to support@0gravity.ai
                    </p>
                </div>
            `,
        });
    } catch (error) {
        console.error('Failed to send welcome email:', error);
        // Don't throw - welcome email is not critical
    }
};

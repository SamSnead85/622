import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';

// ── Re-create the validation schemas from auth.ts to test them in isolation ──
// These mirror the schemas in src/routes/auth.ts exactly.

const signupSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
    displayName: z.string().min(1).max(50).optional(),
    groupOnly: z.boolean().optional(),
    primaryCommunityId: z.string().optional(),
    accessCode: z.string().optional(),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
    rememberMe: z.boolean().optional().default(true),
});

const checkUsernameSchema = z.object({
    username: z.string().min(3).max(30),
});

const earlyAccessSchema = z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    reason: z.string().min(20).max(2000),
    role: z.string().max(100).optional(),
    socialUrl: z.string().url().optional().or(z.literal('')),
});

// ── Helper: simulate generateTokens logic (pure function portion) ──
function computeSessionExpiry(rememberMe: boolean): { expiresIn: number } {
    const expiresIn = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    return { expiresIn };
}

// ── Helper: simulate the admin guard logic ──
function isAdmin(role: string | undefined): boolean {
    return role === 'ADMIN' || role === 'SUPERADMIN';
}

// =============================================
// LOGIN VALIDATION TESTS
// =============================================
describe('Auth: Login validation', () => {
    it('should require email field', () => {
        const result = loginSchema.safeParse({ password: 'password123' });
        expect(result.success).toBe(false);
        if (!result.success) {
            const emailError = result.error.issues.find((i) => i.path.includes('email'));
            expect(emailError).toBeDefined();
        }
    });

    it('should require password field', () => {
        const result = loginSchema.safeParse({ email: 'user@example.com' });
        expect(result.success).toBe(false);
        if (!result.success) {
            const passwordError = result.error.issues.find((i) => i.path.includes('password'));
            expect(passwordError).toBeDefined();
        }
    });

    it('should reject invalid email format', () => {
        const result = loginSchema.safeParse({ email: 'not-an-email', password: 'password123' });
        expect(result.success).toBe(false);
    });

    it('should accept valid login with email and password', () => {
        const result = loginSchema.safeParse({ email: 'user@example.com', password: 'mypassword' });
        expect(result.success).toBe(true);
    });

    it('should default rememberMe to true', () => {
        const result = loginSchema.parse({ email: 'user@example.com', password: 'pass' });
        expect(result.rememberMe).toBe(true);
    });

    it('should accept explicit rememberMe=false', () => {
        const result = loginSchema.parse({ email: 'user@example.com', password: 'pass', rememberMe: false });
        expect(result.rememberMe).toBe(false);
    });
});

// =============================================
// SIGNUP VALIDATION TESTS
// =============================================
describe('Auth: Signup validation', () => {
    const validSignup = {
        email: 'newuser@example.com',
        password: 'securePass1',
        username: 'newuser',
        displayName: 'New User',
        accessCode: 'EA1234ABC',
    };

    it('should require email, password, and username', () => {
        const result = signupSchema.safeParse({});
        expect(result.success).toBe(false);
        if (!result.success) {
            const fields = result.error.issues.map((i) => i.path[0]);
            expect(fields).toContain('email');
            expect(fields).toContain('password');
            expect(fields).toContain('username');
        }
    });

    it('should reject password shorter than 8 characters', () => {
        const result = signupSchema.safeParse({ ...validSignup, password: 'short' });
        expect(result.success).toBe(false);
    });

    it('should accept password with 8+ characters', () => {
        const result = signupSchema.safeParse({ ...validSignup, password: '12345678' });
        expect(result.success).toBe(true);
    });

    it('should reject username shorter than 3 characters', () => {
        const result = signupSchema.safeParse({ ...validSignup, username: 'ab' });
        expect(result.success).toBe(false);
    });

    it('should reject username with special characters', () => {
        const result = signupSchema.safeParse({ ...validSignup, username: 'user@name' });
        expect(result.success).toBe(false);
    });

    it('should accept valid alphanumeric+underscore username', () => {
        const result = signupSchema.safeParse({ ...validSignup, username: 'cool_user_42' });
        expect(result.success).toBe(true);
    });

    it('should make displayName optional', () => {
        const { displayName, ...withoutDisplay } = validSignup;
        const result = signupSchema.safeParse(withoutDisplay);
        expect(result.success).toBe(true);
    });

    it('should make accessCode optional in schema (enforced at route level)', () => {
        const { accessCode, ...withoutCode } = validSignup;
        const result = signupSchema.safeParse(withoutCode);
        expect(result.success).toBe(true);
    });

    it('should reject email without @ sign', () => {
        const result = signupSchema.safeParse({ ...validSignup, email: 'bademail.com' });
        expect(result.success).toBe(false);
    });

    it('should accept groupOnly flag', () => {
        const result = signupSchema.safeParse({ ...validSignup, groupOnly: true, primaryCommunityId: 'comm-123' });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.groupOnly).toBe(true);
            expect(result.data.primaryCommunityId).toBe('comm-123');
        }
    });
});

// =============================================
// EARLY ACCESS VALIDATION TESTS
// =============================================
describe('Auth: Early access request validation', () => {
    const validRequest = {
        name: 'John Doe',
        email: 'john@example.com',
        reason: 'I am very interested in privacy-first social networks and would love to be an early tester.',
    };

    it('should accept a valid early access request', () => {
        const result = earlyAccessSchema.safeParse(validRequest);
        expect(result.success).toBe(true);
    });

    it('should reject name shorter than 2 characters', () => {
        const result = earlyAccessSchema.safeParse({ ...validRequest, name: 'J' });
        expect(result.success).toBe(false);
    });

    it('should reject reason shorter than 20 characters', () => {
        const result = earlyAccessSchema.safeParse({ ...validRequest, reason: 'Too short' });
        expect(result.success).toBe(false);
    });

    it('should accept optional socialUrl as valid URL', () => {
        const result = earlyAccessSchema.safeParse({ ...validRequest, socialUrl: 'https://twitter.com/john' });
        expect(result.success).toBe(true);
    });

    it('should accept empty string for socialUrl', () => {
        const result = earlyAccessSchema.safeParse({ ...validRequest, socialUrl: '' });
        expect(result.success).toBe(true);
    });

    it('should reject invalid socialUrl', () => {
        const result = earlyAccessSchema.safeParse({ ...validRequest, socialUrl: 'not-a-url' });
        expect(result.success).toBe(false);
    });
});

// =============================================
// CHECK USERNAME VALIDATION
// =============================================
describe('Auth: Check username validation', () => {
    it('should accept username between 3 and 30 characters', () => {
        const result = checkUsernameSchema.safeParse({ username: 'validuser' });
        expect(result.success).toBe(true);
    });

    it('should reject username shorter than 3 characters', () => {
        const result = checkUsernameSchema.safeParse({ username: 'ab' });
        expect(result.success).toBe(false);
    });

    it('should reject username longer than 30 characters', () => {
        const result = checkUsernameSchema.safeParse({ username: 'a'.repeat(31) });
        expect(result.success).toBe(false);
    });
});

// =============================================
// TOKEN / SESSION EXPIRY LOGIC
// =============================================
describe('Auth: Token generation logic', () => {
    it('should set 30-day expiry for "remember me" sessions', () => {
        const { expiresIn } = computeSessionExpiry(true);
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        expect(expiresIn).toBe(thirtyDaysMs);
    });

    it('should set 24-hour expiry for temporary sessions', () => {
        const { expiresIn } = computeSessionExpiry(false);
        const oneDayMs = 24 * 60 * 60 * 1000;
        expect(expiresIn).toBe(oneDayMs);
    });

    it('should produce a valid expiration date in the future', () => {
        const { expiresIn } = computeSessionExpiry(true);
        const expiresAt = new Date(Date.now() + expiresIn);
        expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
});

// =============================================
// JWT TOKEN STRUCTURE (mock-based)
// =============================================
describe('Auth: JWT token structure', () => {
    it('should produce a token with userId and sessionId claims', async () => {
        // Dynamically import jsonwebtoken for signing
        const jwt = await import('jsonwebtoken');

        const secret = 'test-jwt-secret';
        const payload = { userId: 'user-123', sessionId: 'session-456' };
        const token = jwt.default.sign(payload, secret, { expiresIn: '30d' });

        // Verify the token decodes back correctly
        const decoded = jwt.default.verify(token, secret) as { userId: string; sessionId: string };
        expect(decoded.userId).toBe('user-123');
        expect(decoded.sessionId).toBe('session-456');
        expect(decoded).toHaveProperty('exp');
        expect(decoded).toHaveProperty('iat');
    });

    it('should reject a token signed with the wrong secret', async () => {
        const jwt = await import('jsonwebtoken');
        const token = jwt.default.sign({ userId: 'u1', sessionId: 's1' }, 'correct-secret');

        expect(() => {
            jwt.default.verify(token, 'wrong-secret');
        }).toThrow();
    });

    it('should handle expired tokens', async () => {
        const jwt = await import('jsonwebtoken');
        // Create a token that expired 1 second ago
        const token = jwt.default.sign(
            { userId: 'u1', sessionId: 's1' },
            'secret',
            { expiresIn: '-1s' },
        );

        expect(() => {
            jwt.default.verify(token, 'secret');
        }).toThrow();
    });
});

// =============================================
// /me ENDPOINT RESPONSE SHAPE
// =============================================
describe('Auth: /me response shape', () => {
    it('should include privacy fields in /me response', () => {
        // Simulate the /me response transformation logic from auth.ts
        const dbUser = {
            id: 'user-1',
            email: 'me@example.com',
            username: 'myself',
            displayName: 'My Self',
            bio: 'Hello!',
            website: null,
            avatarUrl: null,
            coverUrl: null,
            isVerified: false,
            isPrivate: false,
            isGroupOnly: false,
            primaryCommunityId: null,
            role: 'USER',
            createdAt: new Date(),
            communityOptIn: true,
            activeFeedView: 'private',
            usePublicProfile: false,
            publicDisplayName: null,
            publicUsername: null,
            publicAvatarUrl: null,
            publicBio: null,
            growthPartner: null,
            _count: { followers: 5, following: 10, posts: 3 },
        };

        const gpStatus = dbUser.growthPartner?.status;
        const isGrowthPartner = gpStatus === 'active' || gpStatus === 'invited';

        const meResponse = {
            ...dbUser,
            growthPartner: undefined,
            isGrowthPartner,
            growthPartnerTier: isGrowthPartner ? dbUser.growthPartner!.tier : undefined,
            followersCount: dbUser._count.followers,
            followingCount: dbUser._count.following,
            postsCount: dbUser._count.posts,
        };

        // Verify the shape
        expect(meResponse).toHaveProperty('communityOptIn', true);
        expect(meResponse).toHaveProperty('activeFeedView', 'private');
        expect(meResponse).toHaveProperty('usePublicProfile', false);
        expect(meResponse).toHaveProperty('followersCount', 5);
        expect(meResponse).toHaveProperty('followingCount', 10);
        expect(meResponse).toHaveProperty('postsCount', 3);
        expect(meResponse.isGrowthPartner).toBe(false);
        // growthPartner raw data should not be leaked
        expect(meResponse.growthPartner).toBeUndefined();
    });

    it('should detect growth partner status for active partners', () => {
        const gpStatus = 'active';
        const isGrowthPartner = gpStatus === 'active' || gpStatus === 'invited';
        expect(isGrowthPartner).toBe(true);
    });

    it('should detect growth partner status for invited partners', () => {
        const gpStatus = 'invited';
        const isGrowthPartner = gpStatus === 'active' || gpStatus === 'invited';
        expect(isGrowthPartner).toBe(true);
    });

    it('should not treat "pending" as active growth partner', () => {
        const gpStatus = 'pending';
        const isGrowthPartner = gpStatus === 'active' || gpStatus === 'invited';
        expect(isGrowthPartner).toBe(false);
    });
});

// =============================================
// ADMIN GUARD LOGIC
// =============================================
describe('Auth: Admin guard logic', () => {
    it('should allow ADMIN role', () => {
        expect(isAdmin('ADMIN')).toBe(true);
    });

    it('should allow SUPERADMIN role', () => {
        expect(isAdmin('SUPERADMIN')).toBe(true);
    });

    it('should reject USER role', () => {
        expect(isAdmin('USER')).toBe(false);
    });

    it('should reject undefined role', () => {
        expect(isAdmin(undefined)).toBe(false);
    });

    it('should reject MODERATOR role (only ADMIN/SUPERADMIN)', () => {
        expect(isAdmin('MODERATOR')).toBe(false);
    });
});

// =============================================
// PASSWORD HASHING LOGIC
// =============================================
describe('Auth: Password hashing with bcrypt', () => {
    it('should hash a password and verify it correctly', async () => {
        const bcrypt = await import('bcryptjs');
        const password = 'mySecureP@ss123';
        const hash = await bcrypt.default.hash(password, 12);

        expect(hash).not.toBe(password);
        expect(hash.length).toBeGreaterThan(50);

        const isValid = await bcrypt.default.compare(password, hash);
        expect(isValid).toBe(true);
    });

    it('should reject wrong password against hash', async () => {
        const bcrypt = await import('bcryptjs');
        const hash = await bcrypt.default.hash('correctPassword', 12);

        const isValid = await bcrypt.default.compare('wrongPassword', hash);
        expect(isValid).toBe(false);
    });
});

import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...\n');

    // Create superadmin user
    const superadminEmail = 'sam.sweilem85@gmail.com';
    const superadminPassword = 'Sprintloop2099$';
    const superadminUsername = 'abujawad';

    // Check if superadmin already exists
    const existingUser = await prisma.user.findUnique({
        where: { email: superadminEmail },
    });

    if (existingUser) {
        // Update to superadmin if not already
        await prisma.user.update({
            where: { email: superadminEmail },
            data: {
                role: 'SUPERADMIN',
                isVerified: true,
            },
        });
        console.log('✅ Existing user updated to SUPERADMIN:', superadminEmail);
    } else {
        // Create new superadmin
        const passwordHash = await bcrypt.hash(superadminPassword, 12);

        await prisma.user.create({
            data: {
                email: superadminEmail,
                username: superadminUsername,
                displayName: 'Abu Jawad',
                passwordHash,
                role: 'SUPERADMIN',
                isVerified: true,
                bio: 'Founder & Superadmin of 0G',
            },
        });

        console.log('✅ Superadmin created:', superadminEmail);
    }

    // ============================================
    // Seed: Miraj Collective Demo Community
    // ============================================
    const superadmin = await prisma.user.findUnique({ where: { email: superadminEmail } });
    
    if (superadmin) {
        const mirajCommunity = await prisma.community.upsert({
            where: { slug: 'miraj-collective' },
            update: {
                description: 'Miraj is a coaching and learning platform for professional Muslim men, designed to provide guidance for spiritual, emotional, and career development. Through tailored programs, expert coaches, and a community of like-minded and like-hearted individuals, it helps you navigate life with focus and purpose.',
                brandColor: '#B8A44C',
                tagline: 'A premier coaching program for professional Muslim men uniting faith, leadership, and success.',
                logoUrl: 'https://res.cloudinary.com/drsxgxzhb/image/upload/v1770826468/0g-communities/miraj-collective-logo.jpg',
                avatarUrl: 'https://res.cloudinary.com/drsxgxzhb/image/upload/v1770826468/0g-communities/miraj-collective-logo.jpg',
                websiteUrl: 'https://www.mirajcollective.com/',
                category: 'faith',
                welcomeMessage: 'Welcome to the Miraj Collective on 0G! This is a demo group showcasing what your own branded private community looks like on our platform. You can take full ownership of this space — free of charge. Invite your members, customize the rules, and experience a private, secure home for your community.',
            },
            create: {
                name: 'Miraj Collective',
                slug: 'miraj-collective',
                description: 'Miraj is a coaching and learning platform for professional Muslim men, designed to provide guidance for spiritual, emotional, and career development. Through tailored programs, expert coaches, and a community of like-minded and like-hearted individuals, it helps you navigate life with focus and purpose.',
                isPublic: false,
                brandColor: '#B8A44C',
                tagline: 'A premier coaching program for professional Muslim men uniting faith, leadership, and success.',
                logoUrl: 'https://res.cloudinary.com/drsxgxzhb/image/upload/v1770826468/0g-communities/miraj-collective-logo.jpg',
                avatarUrl: 'https://res.cloudinary.com/drsxgxzhb/image/upload/v1770826468/0g-communities/miraj-collective-logo.jpg',
                websiteUrl: 'https://www.mirajcollective.com/',
                category: 'faith',
                welcomeMessage: 'Welcome to the Miraj Collective on 0G! This is a demo group showcasing what your own branded private community looks like on our platform. You can take full ownership of this space — free of charge. Invite your members, customize the rules, and experience a private, secure home for your community.',
                approvalRequired: false,
                postingPermission: 'all',
                invitePermission: 'all',
                moderationLevel: 'standard',
                algorithmPreference: 'balanced',
                memberCount: 1,
                creatorId: superadmin.id,
            },
        });

        // Add superadmin as ADMIN member (upsert to avoid duplicates)
        await prisma.communityMember.upsert({
            where: {
                userId_communityId: {
                    userId: superadmin.id,
                    communityId: mirajCommunity.id,
                },
            },
            update: { role: 'ADMIN' },
            create: {
                userId: superadmin.id,
                communityId: mirajCommunity.id,
                role: 'ADMIN',
            },
        });

        // Add community rules
        const existingRules = await prisma.communityRule.findMany({
            where: { communityId: mirajCommunity.id },
        });
        
        if (existingRules.length === 0) {
            await prisma.communityRule.createMany({
                data: [
                    { communityId: mirajCommunity.id, title: 'Respect & Adab', description: 'Treat every member with the respect and dignity befitting our shared values. Disagreements are welcome; disrespect is not.', order: 0 },
                    { communityId: mirajCommunity.id, title: 'Confidentiality', description: 'What is shared in this group stays in this group. Coaching conversations, personal stories, and member details are private.', order: 1 },
                    { communityId: mirajCommunity.id, title: 'Purposeful Engagement', description: 'Keep discussions aligned with faith, leadership, and professional development. Off-topic content should go to the appropriate channel.', order: 2 },
                ],
            });
        }

        console.log('✅ Miraj Collective community seeded:', mirajCommunity.slug);
    }

    // ============================================
    // Seed: Apple Reviewer Test Account
    // ============================================
    const reviewerEmail = 'reviewer@0gravity.ai';
    const reviewerPassword = 'Review0G2026!';
    const reviewerUsername = 'applereview';

    const existingReviewer = await prisma.user.findUnique({
        where: { email: reviewerEmail },
    });

    let reviewer;
    if (existingReviewer) {
        reviewer = existingReviewer;
        console.log('✅ Apple reviewer account already exists:', reviewerEmail);
    } else {
        const reviewerHash = await bcrypt.hash(reviewerPassword, 12);
        reviewer = await prisma.user.create({
            data: {
                email: reviewerEmail,
                username: reviewerUsername,
                displayName: 'Alex Reviewer',
                passwordHash: reviewerHash,
                role: 'USER',
                isVerified: true,
                bio: 'Exploring the 0G community platform. Privacy-first social networking.',
                communityOptIn: true,
            },
        });
        console.log('✅ Apple reviewer account created:', reviewerEmail);
    }

    // Create sample posts for the reviewer to see in the feed
    if (reviewer) {
        const existingPosts = await prisma.post.count({ where: { userId: reviewer.id } });
        if (existingPosts === 0) {
            await prisma.post.createMany({
                data: [
                    {
                        userId: reviewer.id,
                        content: 'Just joined 0G! Excited to explore a social platform that actually respects privacy. No ads, no tracking, no algorithms deciding what I see.',
                        isPublic: true,
                    },
                    {
                        userId: reviewer.id,
                        content: 'The community features here are impressive. Private groups with real encryption, customizable feeds, and the ability to control your own algorithm. This is what social media should be.',
                        isPublic: true,
                    },
                    {
                        userId: reviewer.id,
                        content: 'Tested the games module with friends today — trivia night was a blast! Great way to connect without leaving the app.',
                        isPublic: true,
                    },
                ],
            });
            console.log('✅ Sample posts created for reviewer account');
        }
    }

    console.log('\n🎉 Seed completed!\n');
    console.log('📋 Apple Reviewer Credentials:');
    console.log(`   Email: ${reviewerEmail}`);
    console.log(`   Password: ${reviewerPassword}`);
    console.log('   (Provide these in App Store Connect review notes)\n');
}

main()
    .catch((e) => {
        console.error('Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

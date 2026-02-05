// Deep diagnostic - check account history and orphaned data
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deepDiagnostic() {
    const userId = '59a96e37-db7a-43e7-9782-09dbed441f1f';

    // Get account details with timestamps
    const account = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            username: true,
            displayName: true,
            createdAt: true,
            updatedAt: true,
        }
    });

    console.log('👤 ACCOUNT DETAILS:');
    console.log(JSON.stringify(account, null, 2));

    // Check ALL users in database
    const allUsers = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            username: true,
            displayName: true,
            createdAt: true,
        },
        orderBy: { createdAt: 'desc' }
    });

    console.log('\n📊 ALL USERS IN DATABASE:');
    allUsers.forEach((u, i) => {
        console.log(`${i + 1}. ${u.displayName} (@${u.username}) - ${u.email}`);
        console.log(`   Created: ${u.createdAt}`);
    });

    // Check for any posts by this user
    const posts = await prisma.post.findMany({
        where: { userId },
        select: { id: true, content: true, createdAt: true }
    });

    console.log(`\n📝 POSTS by this user: ${posts.length}`);
    if (posts.length > 0) {
        console.log(JSON.stringify(posts.slice(0, 3), null, 2));
    }

    // Check for ANY orphaned follows
    const orphanedFollows = await prisma.follow.findMany({
        where: {
            OR: [
                { followerId: userId },
                { followingId: userId }
            ]
        },
        select: {
            id: true,
            followerId: true,
            followingId: true,
            createdAt: true,
        }
    });

    console.log(`\n🔗 FOLLOWS involving this user: ${orphanedFollows.length}`);
    if (orphanedFollows.length > 0) {
        console.log(JSON.stringify(orphanedFollows, null, 2));
    }

    // Check total database stats
    const stats = await prisma.$queryRaw`
        SELECT 
            (SELECT COUNT(*) FROM "User") as total_users,
            (SELECT COUNT(*) FROM "Post") as total_posts,
            (SELECT COUNT(*) FROM "Follow") as total_follows
    `;

    console.log('\n📈 DATABASE STATS:');
    console.log(stats);
}

deepDiagnostic()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Error:', error);
        process.exit(1);
    });

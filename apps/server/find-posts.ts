// Emergency: Search ALL posts in database
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findAllPosts() {
    console.log('🔍 SEARCHING ALL POSTS IN DATABASE...\n');

    // Get ALL posts
    const allPosts = await prisma.post.findMany({
        select: {
            id: true,
            caption: true,
            type: true,
            createdAt: true,
            user: {
                select: {
                    username: true,
                    displayName: true,
                    email: true,
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    console.log(`📊 TOTAL POSTS FOUND: ${allPosts.length}\n`);

    if (allPosts.length === 0) {
        console.log('❌ NO POSTS FOUND IN DATABASE');
    } else {
        console.log('📝 ALL POSTS:');
        allPosts.forEach((post, i) => {
            console.log(`\n${i + 1}. ${post.caption?.substring(0, 100) || '(no caption)'}`);
            console.log(`   By: ${post.user.displayName} (@${post.user.username})`);
            console.log(`   Type: ${post.type}`);
            console.log(`   Created: ${post.createdAt}`);
        });
    }

    // Search for any mentions of "abujawad" in captions
    const abujawadPosts = await prisma.post.findMany({
        where: {
            OR: [
                { caption: { contains: 'abujawad', mode: 'insensitive' } },
                { caption: { contains: 'abu jawad', mode: 'insensitive' } },
            ]
        }
    });

    console.log(`\n🔍 Posts mentioning "abujawad": ${abujawadPosts.length}`);

    // Get database connection info
    console.log('\n📡 DATABASE INFO:');
    console.log('URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'));
}

findAllPosts()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ ERROR:', error.message);
        process.exit(1);
    });

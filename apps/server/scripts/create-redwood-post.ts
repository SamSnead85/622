import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createRedwoodPost() {
    try {
        // Find the admin user (abujawad)
        const adminUser = await prisma.user.findFirst({
            where: { username: 'abujawad' }
        });

        if (!adminUser) {
            console.error('Admin user abujawad not found');
            return;
        }

        console.log('Found admin user:', adminUser.displayName, adminUser.id);

        // Create the Redwood Forest post with YouTube Short URL
        const post = await prisma.post.create({
            data: {
                userId: adminUser.id,
                type: 'VIDEO',
                caption: '🌲 Who\'s up for a trip to the Redwood Forest this weekend? Drop a comment if you\'re down! 🚗✨',
                // YouTube shorts embed URL with minimal branding
                mediaUrl: 'https://www.youtube-nocookie.com/embed/QWRq7jzzyJY?modestbranding=1&rel=0&showinfo=0&controls=1',
                isPublic: true,
                isPinned: false, // Not pinned - just a regular post
            }
        });

        console.log('Created Redwood post:', post.id);
        console.log('✅ Successfully created Redwood Forest trip post!');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

createRedwoodPost();

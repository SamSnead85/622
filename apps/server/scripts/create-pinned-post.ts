import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createPinnedYouTubePost() {
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

        // Create the pinned post with YouTube embed URL (no-cookie for privacy, controls minimal)
        // Using youtube-nocookie.com and modestbranding to hide YouTube branding
        const post = await prisma.post.create({
            data: {
                userId: adminUser.id,
                type: 'VIDEO',
                caption: 'A poem by Khalid ibn al-Walid (RA) for his son Sulayman. SubhanAllah.',
                // YouTube embed URL with minimal branding
                mediaUrl: 'https://www.youtube-nocookie.com/embed/yysbKM86rUU?modestbranding=1&rel=0&showinfo=0&controls=1',
                isPublic: true,
                isPinned: true,
            }
        });

        console.log('Created pinned post:', post.id);

        // Add the comment
        const comment = await prisma.comment.create({
            data: {
                postId: post.id,
                userId: adminUser.id,
                content: `Minute 1:35 is hard.

Sulayman is the son of Khalid ibn al-Walid. A young Sahabi and like his father, he was well-known for his skills in battle. He was killed during the conquest of Egypt in a battle near to Wardan in Giza.

It's said that Khalid wrote this poem some time after the news reached him.

May Allah be pleased with all of them.`
            }
        });

        console.log('Created comment:', comment.id);
        console.log('✅ Successfully created pinned YouTube post with comment!');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

createPinnedYouTubePost();

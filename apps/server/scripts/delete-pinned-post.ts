import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deletePinnedPost() {
    try {
        // Delete the post we just created (this will cascade delete the comment)
        await prisma.post.delete({
            where: { id: '7277198e-f62a-4997-9bc2-740a0ac32f82' }
        });

        console.log('✅ Deleted the YouTube-linked post');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

deletePinnedPost();

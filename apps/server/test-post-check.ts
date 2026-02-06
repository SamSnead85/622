
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkPosts() {
    const posts = await prisma.post.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { user: true }
    });

    console.log('--- LATEST 5 POSTS ---');
    posts.forEach(p => {
        console.log(`[${p.createdAt.toISOString()}] ${p.user.username}: ${p.content}`);
    });
}

checkPosts()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());

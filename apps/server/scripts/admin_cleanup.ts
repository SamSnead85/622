
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        // 1. Promote 'omar' to SUPERADMIN
        const username = 'omar';
        const user = await prisma.user.findFirst({
            where: { username: { equals: username, mode: 'insensitive' } }
        });

        if (user) {
            console.log(`Ensuring user ${user.username} is SUPERADMIN...`);
            await prisma.user.update({
                where: { id: user.id },
                data: { role: 'SUPERADMIN' }
            });
            console.log('User role updated.');
        } else {
            console.log(`User '${username}' not found.`);
            return;
        }

        // 2. Delete demo posts
        console.log('Deleting demo posts (containing "Redwood", "Yosemite", "Big Sur")...');
        const deleteResult = await prisma.post.deleteMany({
            where: {
                OR: [
                    { caption: { contains: 'Redwood', mode: 'insensitive' } },
                    { caption: { contains: 'Yosemite', mode: 'insensitive' } },
                    { caption: { contains: 'Big Sur', mode: 'insensitive' } },
                ]
            }
        });
        console.log(`Deleted ${deleteResult.count} demo posts.`);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();

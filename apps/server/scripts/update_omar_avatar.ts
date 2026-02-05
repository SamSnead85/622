
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Updating Omar avatar...');
    try {
        // Find user with username 'omar' or display name containing 'Omar'
        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { username: { equals: 'omar', mode: 'insensitive' } },
                    { displayName: { contains: 'Omar', mode: 'insensitive' } }
                ]
            }
        });

        if (users.length === 0) {
            console.log('User Omar not found in DB.');
            return;
        }

        for (const user of users) {
            console.log(`Found user: ${user.username} (${user.id}). Updating...`);
            await prisma.user.update({
                where: { id: user.id },
                data: { avatarUrl: '/avatars/omar.jpg' }
            });
        }
        console.log('Update complete.');
    } catch (e) {
        console.error('Error updating avatar:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();

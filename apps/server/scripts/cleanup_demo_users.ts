
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🧹 Starting cleanup of demo users...');

    // Safe list of users to NEVER delete
    const safeUsers = ['abujawad', 'omar', 'sam', 'admin'];

    // List of patterns to delete
    const patterns = ['test', 'demo', 'amel', 'fake', 'temp'];

    for (const pattern of patterns) {
        const deleted = await prisma.user.deleteMany({
            where: {
                username: {
                    contains: pattern,
                    mode: 'insensitive',
                },
                NOT: {
                    username: { in: safeUsers },
                },
            },
        });
        console.log(`Deleted ${deleted.count} users matching "${pattern}"`);
    }

    // Specific fix for "The Guy" (Stock photo users) if they have unique names not covered above
    // We can also delete by email domain if they are fake?

    console.log('✨ Cleanup complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());

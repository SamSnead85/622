// Check for multiple accounts related to user
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAccounts() {
    console.log('🔍 Searching for accounts...\n');

    // Search by email
    const emailAccount = await prisma.user.findUnique({
        where: { email: 'sam.sweilem85@gmail.com' },
        select: {
            id: true,
            email: true,
            username: true,
            displayName: true,
            _count: {
                select: {
                    following: true,
                    followers: true,
                }
            }
        }
    });

    // Search for abujawad accounts
    const abujawadAccounts = await prisma.user.findMany({
        where: {
            OR: [
                { displayName: { contains: 'abujawad', mode: 'insensitive' } },
                { username: { contains: 'abujawad', mode: 'insensitive' } },
            ]
        },
        select: {
            id: true,
            email: true,
            username: true,
            displayName: true,
            _count: {
                select: {
                    following: true,
                    followers: true,
                }
            }
        }
    });

    // Search for Jumana and Omar
    const friends = await prisma.user.findMany({
        where: {
            OR: [
                { displayName: { contains: 'Jumana', mode: 'insensitive' } },
                { displayName: { contains: 'Omar', mode: 'insensitive' } },
                { username: { contains: 'jumana', mode: 'insensitive' } },
                { username: { contains: 'omar', mode: 'insensitive' } },
            ]
        },
        select: {
            id: true,
            email: true,
            username: true,
            displayName: true,
        }
    });

    console.log('📧 Account with email sam.sweilem85@gmail.com:');
    console.log(JSON.stringify(emailAccount, null, 2));

    console.log('\n👤 Accounts with "abujawad":');
    console.log(JSON.stringify(abujawadAccounts, null, 2));

    console.log('\n👥 Found friends (Jumana/Omar):');
    console.log(JSON.stringify(friends, null, 2));

    // Check if abujawad accounts follow Jumana/Omar
    if (abujawadAccounts.length > 0) {
        for (const account of abujawadAccounts) {
            console.log(`\n🔗 Checking follows for ${account.displayName} (${account.username}):`);
            const following = await prisma.follow.findMany({
                where: { followerId: account.id },
                include: {
                    following: {
                        select: { displayName: true, username: true }
                    }
                }
            });
            console.log('Following:', following.map(f => f.following.displayName));
        }
    }
}

checkAccounts()
    .then(() => {
        console.log('\n✅ Done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Error:', error);
        process.exit(1);
    });

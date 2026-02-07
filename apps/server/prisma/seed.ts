import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...\n');

    // Create superadmin user
    const superadminEmail = 'sam.sweilem85@gmail.com';
    const superadminPassword = 'Sprintloop2099$';
    const superadminUsername = 'abujawad';

    // Check if superadmin already exists
    const existingUser = await prisma.user.findUnique({
        where: { email: superadminEmail },
    });

    if (existingUser) {
        // Update to superadmin if not already
        await prisma.user.update({
            where: { email: superadminEmail },
            data: {
                role: 'SUPERADMIN',
                isVerified: true,
            },
        });
        console.log('✅ Existing user updated to SUPERADMIN:', superadminEmail);
    } else {
        // Create new superadmin
        const passwordHash = await bcrypt.hash(superadminPassword, 12);

        await prisma.user.create({
            data: {
                email: superadminEmail,
                username: superadminUsername,
                displayName: 'Abu Jawad',
                passwordHash,
                role: 'SUPERADMIN',
                isVerified: true,
                bio: 'Founder & Superadmin of 0G',
            },
        });

        console.log('✅ Superadmin created:', superadminEmail);
    }

    console.log('\n🎉 Seed completed!\n');
}

main()
    .catch((e) => {
        console.error('Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

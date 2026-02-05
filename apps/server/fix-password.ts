// Quick script to check and fix sam.sweilem85 password
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function fixPassword() {
    const email = 'sam.sweilem85@gmail.com';
    const password = 'Sprintloop2099$';

    // Check current state
    const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, username: true, passwordHash: true }
    });

    console.log('Current user state:');
    console.log('- Email:', user?.email);
    console.log('- Username:', user?.username);
    console.log('- Has password hash:', !!user?.passwordHash);
    console.log('- Password hash length:', user?.passwordHash?.length || 0);

    if (!user) {
        console.error('User not found!');
        return;
    }

    // If no password, set it
    if (!user.passwordHash) {
        console.log('\n❌ No password hash found! Setting password...');
        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.update({
            where: { email },
            data: { passwordHash: hashedPassword }
        });

        console.log('✅ Password hash set successfully!');
    } else {
        console.log('\n✅ Password hash exists');

        // Test if current password works
        const isValid = await bcrypt.compare(password, user.passwordHash);
        console.log('- Password validates:', isValid);

        if (!isValid) {
            console.log('\n⚠️  Password does not match! Resetting...');
            const hashedPassword = await bcrypt.hash(password, 10);

            await prisma.user.update({
                where: { email },
                data: { passwordHash: hashedPassword }
            });

            console.log('✅ Password reset successfully!');
        }
    }

    // Final verification
    const updatedUser = await prisma.user.findUnique({
        where: { email },
        select: { passwordHash: true }
    });

    const finalCheck = await bcrypt.compare(password, updatedUser!.passwordHash!);
    console.log('\n🔒 Final verification:', finalCheck ? '✅ PASS' : '❌ FAIL');
}

fixPassword()
    .then(() => {
        console.log('\n✅ Done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Error:', error);
        process.exit(1);
    });

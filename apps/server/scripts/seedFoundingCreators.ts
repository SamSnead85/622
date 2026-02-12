/**
 * Seed Founding Creator Access Codes
 *
 * Generates one-time-use access codes of type 'founding_creator'.
 * When a user signs up with one of these codes, they are automatically
 * elevated to trustLevel 3, verified, and given a full CreatorProfile.
 *
 * Usage:
 *   npx ts-node scripts/seedFoundingCreators.ts --count 50
 *   npx ts-node scripts/seedFoundingCreators.ts --count 10 --prefix VIP
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

function parseArgs(): { count: number; prefix: string } {
    const args = process.argv.slice(2);
    let count = 50;
    let prefix = 'FC';

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--count' && args[i + 1]) {
            count = Math.max(1, Math.min(1000, parseInt(args[i + 1], 10) || 50));
            i++;
        }
        if (args[i] === '--prefix' && args[i + 1]) {
            prefix = args[i + 1].toUpperCase().slice(0, 4);
            i++;
        }
    }

    return { count, prefix };
}

async function main() {
    const { count, prefix } = parseArgs();

    console.log(`\n🎬 Generating ${count} founding creator access codes (prefix: ${prefix})...\n`);

    const codes: { code: string; id: string }[] = [];

    for (let i = 0; i < count; i++) {
        const code = `${prefix}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

        try {
            const record = await prisma.accessCode.create({
                data: {
                    code,
                    type: 'founding_creator',
                    maxUses: 1,
                    isActive: true,
                },
            });
            codes.push({ code: record.code, id: record.id });
        } catch (err: any) {
            // Collision on unique code — retry with different random bytes
            const retryCode = `${prefix}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
            const record = await prisma.accessCode.create({
                data: {
                    code: retryCode,
                    type: 'founding_creator',
                    maxUses: 1,
                    isActive: true,
                },
            });
            codes.push({ code: record.code, id: record.id });
        }
    }

    // Output as CSV
    console.log('name,code,signup_link');
    for (const { code } of codes) {
        const signupLink = `https://0gravity.ai/signup?code=${encodeURIComponent(code)}`;
        console.log(`Founding Creator,${code},${signupLink}`);
    }

    console.log(`\n✅ Successfully created ${codes.length} founding creator access codes.`);
    console.log(`   Type: founding_creator | Max uses: 1 each`);
    console.log(`\n   Copy the CSV above to share with creators.\n`);
}

main()
    .catch((err) => {
        console.error('Error:', err);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());

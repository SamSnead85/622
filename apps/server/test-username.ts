import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function testUsernameUpdate() {
  const user = await prisma.user.findFirst({
    where: { username: 'samsweilem85nezv' }
  });
  
  if (!user) {
    console.log('User not found');
    return;
  }
  
  console.log('Before:', user.username);
  
  try {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { username: 'abujawad' }
    });
    console.log('After:', updated.username);
    console.log('✅ SUCCESS');
  } catch (e: any) {
    console.log('❌ Error:', e.message);
  }
  
  await prisma.$disconnect();
}

testUsernameUpdate();

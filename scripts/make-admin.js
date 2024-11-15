const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function makeAdmin() {
  try {
    const updatedUser = await prisma.user.update({
      where: {
        id: '7bb3a0e1-4b39-4b6d-bf87-6b443c265184'
      },
      data: {
        isAdmin: true
      }
    });

    console.log('✅ User successfully updated to admin:', updatedUser);
  } catch (error) {
    console.error('❌ Error updating user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

makeAdmin();
// This script makes a user an admin
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function makeAdmin() {
  try {
    const email = 'admin@example.com';
    
    const user = await prisma.user.update({
      where: { email },
      data: { isAdmin: true }
    });
    
    console.log(`User ${user.name} (${user.email}) is now an admin!`);
  } catch (error) {
    console.error('Error updating user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

makeAdmin(); 
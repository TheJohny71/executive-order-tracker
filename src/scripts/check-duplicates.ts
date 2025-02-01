// src/scripts/check-duplicates.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDuplicateUrls() {
  try {
    // Find all duplicate URLs
    const duplicates = await prisma.$queryRaw`
      SELECT url, COUNT(*) as count, array_agg(id) as ids, array_agg(title) as titles
      FROM "ExecutiveOrder"
      GROUP BY url
      HAVING COUNT(*) > 1
    `;

    if (Array.isArray(duplicates) && duplicates.length > 0) {
      console.log('Found duplicate URLs:');
      console.log(JSON.stringify(duplicates, null, 2));
      console.log('\nPlease resolve these duplicates before adding the unique constraint.');
    } else {
      console.log('No duplicate URLs found. Safe to add unique constraint.');
    }
  } catch (error) {
    console.error('Error checking duplicates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDuplicateUrls();
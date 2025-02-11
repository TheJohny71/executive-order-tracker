import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';

const prisma = new PrismaClient();

async function main() {
  try {
    logger.info('Starting migration...');

    const statusResult = await prisma.status.findMany({
      where: { name: 'Active' },
    });

    const statusId = statusResult[0]?.id ?? 1;
    
    // Use the statusId in an update operation
    await prisma.order.updateMany({
      where: {
        statusId: null
      },
      data: {
        statusId
      }
    });
    
    logger.info('Migration completed successfully');
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}
import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';

const prisma = new PrismaClient();

async function testDatabaseConnection() {
  try {
    logger.info('Testing database connection...');
    
    // Test connection
    await prisma.$connect();
    logger.info('Successfully connected to database');
    
    // Get current document count
    const orderCount = await prisma.order.count();
    logger.info(`Current number of orders in database: ${orderCount}`);
    
    // Get latest documents
    const latestOrders = await prisma.order.findMany({
      take: 5,
      orderBy: {
        datePublished: 'desc'
      },
      select: {
        title: true,
        datePublished: true,
        type: true,
        number: true
      }
    });
    
    logger.info('Latest 5 orders:', latestOrders);

    // Test specific date range query
    const ordersFrom2025 = await prisma.order.count({
      where: {
        datePublished: {
          gte: new Date('2025-01-01T00:00:00Z')
        }
      }
    });
    
    logger.info(`Number of orders from 2025 onwards: ${ordersFrom2025}`);

  } catch (error) {
    logger.error('Database connection test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

testDatabaseConnection()
  .catch(console.error)
  .finally(() => process.exit());

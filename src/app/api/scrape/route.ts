import { PrismaClient } from '@prisma/client';
import { scrapeExecutiveOrders } from '@/lib/scraper';
import { logger } from '@/utils/logger';

const db = new PrismaClient();

export async function GET() {
  try {
    const result = await scrapeExecutiveOrders();
    
    if (!result.success || !result.data) {
      return Response.json({
        success: false,
        message: result.message || 'No results found'
      }, { status: 404 });
    }

    return Response.json({
      success: true,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    logger.error('Error in GET /api/scrape:', error);
    return Response.json({
      success: false,
      message: 'Failed to scrape orders',
      error: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }, { status: 500 });
  } finally {
    await db.$disconnect();
  }
}

export async function POST() {
  return Response.json(
    { error: 'Method not implemented' },
    { status: 501 }
  );
}
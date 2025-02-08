import { DatabaseClient } from '@/lib/db';
import { scrapeExecutiveOrders } from '@/lib/scraper';
import { logger } from '@/utils/logger';

export async function GET() {
  let prisma = null;
  
  try {
    prisma = await DatabaseClient.getInstance();
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
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return Response.json({
      success: false,
      message: 'Failed to scrape orders',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  } finally {
    if (prisma) {
      await DatabaseClient.disconnect();
    }
  }
}

export async function POST() {
  return Response.json(
    { error: 'Method not implemented' },
    { status: 501 }
  );
}

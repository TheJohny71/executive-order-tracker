import { PrismaClient } from '@prisma/client';
import { scrapeExecutiveOrders } from '@/lib/scraper';
import { type NextRequest } from 'next/server';
import { logger } from '@/utils/logger';

const db = new PrismaClient();

interface ScrapedOrder {
  type: string;
  number: string;
  title: string;
  summary: string;
  datePublished: Date;
  category: string;
  agency?: string;
  link?: string;
}

interface ScrapeResponse {
  success: boolean;
  message?: string;
  data?: ScrapedOrder[];
}

export async function GET() {
  try {
    const results = await scrapeExecutiveOrders();
    
    if (!results || results.length === 0) {
      return Response.json({
        success: false,
        message: 'No results found'
      } as ScrapeResponse, { status: 404 });
    }

    return Response.json({
      success: true,
      message: `Successfully scraped ${results.length} orders`,
      data: results
    } as ScrapeResponse);

  } catch (error) {
    logger.error('Error in GET /api/scrape:', error);
    return Response.json({
      success: false,
      message: 'Failed to scrape orders',
      ...(process.env.NODE_ENV === 'development' ? { error: String(error) } : {})
    } as ScrapeResponse, { status: 500 });
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
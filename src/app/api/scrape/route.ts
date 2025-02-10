// File: app/api/scrape/route.ts

import { NextRequest } from 'next/server';
import { scrapeExecutiveOrders } from '@/lib/scraper';
import { logger } from '@/utils/logger';

export async function GET(_req: NextRequest) {
  try {
    logger.info('Received GET /api/scrape request');
    const result = await scrapeExecutiveOrders();

    if (!result.success) {
      return new Response(JSON.stringify(result), { status: 500 });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error('Error in GET /api/scrape:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Scrape failed',
    }), { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { scrapeExecutiveOrders } from '@/lib/scraper';
import pino from 'pino';

const logger = pino({
  transport: {
    target: 'pino-pretty'
  }
});

export const runtime = 'edge';
export const preferredRegion = 'auto';

export async function GET() {
  try {
    await scrapeExecutiveOrders();
    return NextResponse.json({ status: 'success' });
  } catch (error) {
    logger.error('Error in scrape API route:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to scrape executive orders' },
      { status: 500 }
    );
  }
}
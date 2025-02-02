import { NextResponse } from 'next/server';
import { scrapeExecutiveOrders } from '@/lib/scraper';
import pino from 'pino';
import pretty from 'pino-pretty';

const logger = pino(pretty({ colorize: true }));

// Add dynamic export
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const preferredRegion = 'auto';

export async function GET() {
  try {
    await scrapeExecutiveOrders();
    return NextResponse.json({ status: 'success' });
  } catch (error) {
    logger.error({ error }, 'Error in scrape API route');
    return NextResponse.json(
      { status: 'error', message: 'Failed to scrape executive orders' },
      { status: 500 }
    );
  }
}
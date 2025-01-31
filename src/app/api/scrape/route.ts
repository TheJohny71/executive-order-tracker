import { NextResponse } from 'next/server';
import { scrapeExecutiveOrders } from '@/lib/scraper';
import pino from 'pino';
import pretty from 'pino-pretty';

const logger = pino(
  pretty({
    colorize: true
  })
);

// Mark this as a non-edge function since we're using Playwright
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
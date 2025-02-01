// src/app/api/scrape/route.ts
import { NextResponse } from 'next/server';
import { scrapeExecutiveOrders } from '@/lib/scraper';
import type { NextRequest } from 'next/server';
import pino from 'pino';
import pretty from 'pino-pretty';

const logger = pino(pretty({ colorize: true }));

export const runtime = 'nodejs';
export const preferredRegion = 'auto';

export async function GET(request: NextRequest) {
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
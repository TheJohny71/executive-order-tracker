// src/app/api/scrape/route.ts
import { PrismaClient, DocumentType } from '@prisma/client';
import { scrapeExecutiveOrders } from '@/lib/scraper';
import { type NextRequest } from 'next/server';
import { logger } from '@/utils/logger';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const orders = await scrapeExecutiveOrders();
    // Process orders...
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: unknown) {
    logger.error('Error scraping orders:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to scrape orders';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
import { z } from 'zod';
import { DatabaseClient } from '@/lib/db';
import { scrapeExecutiveOrders } from '@/lib/scraper';
import { logger } from '@/utils/logger';

// Response type definitions
const ScrapedDataSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.array(z.object({
    id: z.string(),
    type: z.string(),
    title: z.string(),
    number: z.string(),
    date: z.string(),
    url: z.string(),
    summary: z.string().nullable(),
    content: z.string().nullable(),
  })).optional(),
  error: z.string().optional(),
});

export async function GET() {
  let prisma = null;
  
  try {
    // Initialize database connection
    prisma = await DatabaseClient.getInstance();
    
    // Perform scraping
    const result = await scrapeExecutiveOrders();
    
    if (!result.success || !result.data) {
      return Response.json({
        success: false,
        message: result.message || 'No results found'
      }, { status: 404 });
    }

    // Validate response data
    const validatedResponse = ScrapedDataSchema.parse({
      success: true,
      message: result.message,
      data: result.data
    });

    return Response.json(validatedResponse);

  } catch (error) {
    logger.error('Error in GET /api/scrape:', error);
    
    let statusCode = 500;
    let errorMessage = 'Failed to scrape orders';
    
    if (error instanceof z.ZodError) {
      statusCode = 400;
      errorMessage = 'Invalid scraping result format';
    }

    return Response.json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' 
        ? error instanceof Error ? error.message : 'Unknown error'
        : undefined
    }, { status: statusCode });

  } finally {
    // Clean up database connection
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
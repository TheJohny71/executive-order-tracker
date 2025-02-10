// File: src/lib/scraper.ts

import { prisma, DocumentType } from '@/lib/db';
import { logger } from '@/utils/logger';

export async function scrapeExecutiveOrders() {
  try {
    logger.info('Starting executive order scraping…');

    // Example: Hard-coded mock
    const scrapedEO = {
      type: DocumentType.EXECUTIVE_ORDER, // fixes "string not assignable" issue
      title: 'Mock Executive Order from Scraper',
      summary: 'Scraped summary text goes here',
      datePublished: new Date(),
      link: 'https://example.gov/eo/12345',
      categories: ['Mock Category'],
      agencies: ['Mock Agency'],
    };

    // Insert into DB
    const created = await prisma.order.create({
      data: {
        type: scrapedEO.type,
        title: scrapedEO.title,
        summary: scrapedEO.summary,
        datePublished: scrapedEO.datePublished,
        link: scrapedEO.link,
        categories: {
          connectOrCreate: scrapedEO.categories.map((c) => ({
            where: { name: c },
            create: { name: c },
          })),
        },
        agencies: {
          connectOrCreate: scrapedEO.agencies.map((a) => ({
            where: { name: a },
            create: { name: a },
          })),
        },
      },
      include: {
        categories: true,
        agencies: true,
      },
    });

    return {
      success: true,
      message: 'Scraping completed successfully',
      data: [created],
    };
  } catch (error) {
    logger.error('Error in scrapeExecutiveOrders:', error);
    return {
      success: false,
      message: 'Failed to scrape executive orders',
      data: [],
    };
  }
}

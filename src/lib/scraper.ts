import { prisma, DocumentType } from '@/lib/db';
import { logger } from '@/utils/logger';

/** Example "scrape" function. Insert a new mock record. */
export async function scrapeExecutiveOrders() {
  try {
    logger.info('Starting executive order scraping…');

    const scrapedEO = {
      type: DocumentType.EXECUTIVE_ORDER, // Must match the enum
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

        // M:N for categories & agencies
        categories: {
          connectOrCreate: scrapedEO.categories.map((cat) => ({
            where: { name: cat },
            create: { name: cat },
          })),
        },
        agencies: {
          connectOrCreate: scrapedEO.agencies.map((ag) => ({
            where: { name: ag },
            create: { name: ag },
          })),
        },
      },
      // Must match the fields in your schema
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

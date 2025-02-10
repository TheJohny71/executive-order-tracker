// src/scripts/test-scraper.ts
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import type { OrdersResponse } from '../lib/api/types';

const prisma = new PrismaClient();
const baseURL = process.env.NEXT_PUBLIC_AWS_API_URL || "http://localhost:3000";

async function fetchOrders({ page, limit }: { page: number; limit: number }): Promise<OrdersResponse> {
    try {
        // Construct the URL properly keeping the /prod path
        const url = new URL(baseURL);
        
        // If we're using API Gateway, the path should be /prod/api/orders
        // If we're using localhost, it should be /api/orders
        const path = url.hostname.includes('execute-api') 
            ? `/prod/api/orders`
            : `/api/orders`;
            
        url.pathname = path;
        url.searchParams.append('page', page.toString());
        url.searchParams.append('limit', limit.toString());
        
        logger.info('Full URL:', url.toString());
        
        const response = await fetch(url.toString(), {
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return response.json();
    } catch (error) {
        logger.error('Fetch error details:', {
            baseURL,
            error: error instanceof Error ? error.message : 'Unknown error',
            cause: error instanceof Error ? error.cause : undefined
        });
        throw error;
    }
}

async function testScraper() {
    try {
        logger.info('Starting scraper test...');
        logger.info('API Base URL:', baseURL);

        // Test API connection
        logger.info('Testing API connection...');
        const response = await fetchOrders({
            page: 1,
            limit: 10
        });
        
        logger.info(`Successfully connected to API. Found ${response.orders.length} orders`);
        
        // Get current count
        const beforeCount = await prisma.order.count({
            where: {
                datePublished: {
                    gte: new Date('2025-01-01')
                }
            }
        });
        logger.info(`Current document count from 2025: ${beforeCount}`);

        // Get latest documents
        const latestDocs = await prisma.order.findMany({
            where: {
                datePublished: {
                    gte: new Date('2025-01-01')
                }
            },
            orderBy: { datePublished: 'desc' },
            take: 5,
            select: {
                id: true,
                title: true,
                datePublished: true,
                type: true,
                number: true,
                link: true,
                status: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });

        logger.info('Latest documents in database:', latestDocs);

    } catch (error) {
        logger.error('Scraper test failed:', error instanceof Error ? error.message : 'Unknown error');
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the test if this is the main module
if (import.meta.url.endsWith('test-scraper.ts')) {
    testScraper()
        .catch((error) => {
            logger.error('Unhandled error:', error);
            process.exit(1);
        })
        .finally(async () => {
            await prisma.$disconnect();
            process.exit(0);
        });
}

export { testScraper, fetchOrders };
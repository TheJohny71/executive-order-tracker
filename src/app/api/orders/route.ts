import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import pino from 'pino';
import pretty from 'pino-pretty';
import { scrapeExecutiveOrders } from '@/lib/scraper';

const prisma = new PrismaClient();
const logger = pino(pretty({ colorize: true }));

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const preferredRegion = 'auto';

type WhereClause = {
 type?: string;
 date?: {
   gte?: Date;
   lte?: Date;
 };
 OR?: {
   title?: { contains: string; mode: 'insensitive' | 'default' };
   summary?: { contains: string; mode: 'insensitive' | 'default' };
 }[];
 categories?: {
   some: { name: string };
 };
 agencies?: {
   some: { name: string };
 };
};

interface Category {
 name: string;
}

interface Agency {
 name: string;
}

export async function GET(request: Request) {
 try {
   logger.info('Starting GET request for orders');
   const { searchParams } = new URL(request.url);
   
   const type = searchParams.get('type');
   const category = searchParams.get('category');
   const agency = searchParams.get('agency');
   const search = searchParams.get('search');
   const dateFrom = searchParams.get('dateFrom');
   const dateTo = searchParams.get('dateTo');
   const page = parseInt(searchParams.get('page') || '1');
   const limit = parseInt(searchParams.get('limit') || '10');

   logger.info({ 
     type, category, agency, search, 
     dateFrom, dateTo, page, limit 
   }, 'Query parameters');

   const where: WhereClause = {};

   if (type && type !== 'all') {
     where.type = type;
   }

   if (category && category !== 'all') {
     where.categories = {
       some: { name: category }
     };
   }

   if (agency && agency !== 'all') {
     where.agencies = {
       some: { name: agency }
     };
   }

   if (search) {
     where.OR = [
       { 
         title: { contains: search, mode: 'insensitive' }
       },
       { 
         summary: { contains: search, mode: 'insensitive' }
       }
     ];
   }

   if (dateFrom || dateTo) {
     where.date = {};
     if (dateFrom) where.date.gte = new Date(dateFrom);
     if (dateTo) where.date.lte = new Date(dateTo);
   }

   logger.info({ where }, 'Constructed where clause');

   try {
     const total = await prisma.executiveOrder.count({ where });
     logger.info({ total }, 'Got total count');

     const orders = await prisma.executiveOrder.findMany({
       where,
       include: {
         categories: true,
         agencies: true
       },
       orderBy: {
         date: 'desc'
       },
       skip: (page - 1) * limit,
       take: limit
     });
     logger.info(`Retrieved ${orders.length} orders`);

     const [categories, agencies] = await Promise.all([
       prisma.category.findMany(),
       prisma.agency.findMany()
     ]);
     logger.info('Retrieved categories and agencies');

     return NextResponse.json({
       orders,
       metadata: {
         categories: categories.map((c: Category) => c.name),
         agencies: agencies.map((a: Agency) => a.name)
       },
       filteredCount: total,
       pagination: {
         total,
         pages: Math.ceil(total / limit),
         currentPage: page,
         limit
       }
     });
   } catch (dbError) {
     logger.error({ error: dbError }, 'Database operation failed');
     throw dbError;
   }
 } catch (error) {
   logger.error({ error }, 'Error in GET /api/orders');
   return NextResponse.json(
     { error: 'Failed to fetch orders', details: error instanceof Error ? error.message : 'Unknown error' },
     { status: 500 }
   );
 } finally {
   await prisma.$disconnect();
 }
}

export async function POST(request: Request) {
 try {
   logger.info('Starting manual refresh of orders');
   
   // Get API key from request headers
   const apiKey = request.headers.get('x-api-key');
   if (!apiKey || apiKey !== process.env.API_KEY) {
     return NextResponse.json(
       { error: 'Unauthorized' },
       { status: 401 }
     );
   }

   await scrapeExecutiveOrders();
   
   return NextResponse.json({ 
     message: 'Orders refreshed successfully',
     timestamp: new Date().toISOString()
   });
 } catch (error) {
   logger.error({ error }, 'Error refreshing orders');
   return NextResponse.json(
     { 
       error: 'Failed to refresh orders',
       details: error instanceof Error ? error.message : 'Unknown error'
     },
     { status: 500 }
   );
 } finally {
   await prisma.$disconnect();
 }
}
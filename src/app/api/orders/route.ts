import { NextRequest } from 'next/server';
import { z } from 'zod';
import sanitize from 'sanitize-html';
import { prisma } from '@/lib/db';
import { DocumentType } from '@prisma/client';
import { logger } from '@/utils/logger';
import type { WhereClause, OrderCreateInput, QueryResult, OrdersResponse } from '@/types';

// Validate query params
const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(10),
  search: z.string().trim().optional(),
  type: z.nativeEnum(DocumentType).optional(),
  category: z.string().optional(),
  agency: z.string().optional(),
});

const sanitizeOptions = {
  allowedTags: [],
  allowedAttributes: {},
};

/** GET /api/orders */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const rawParams = Object.fromEntries(url.searchParams.entries());
    const params = querySchema.parse(rawParams);

    const page = params.page;
    const limit = params.limit;
    const skip = (page - 1) * limit;

    // Build where clause using our WhereClause type
    const where: WhereClause = {};
    
    if (params.search) {
      const s = sanitize(params.search, sanitizeOptions);
      where.OR = [
        { title: { contains: s, mode: 'insensitive' } },
        { summary: { contains: s, mode: 'insensitive' } },
        { number: { contains: s, mode: 'insensitive' } }
      ];
    }

    if (params.type) {
      where.type = params.type;
    }

    if (params.category) {
      where.category = {
        equals: params.category,
        mode: 'insensitive'
      };
    }

    if (params.agency) {
      where.agency = {
        equals: params.agency,
        mode: 'insensitive'
      };
    }

    // Fetch all data in parallel
    const [totalCount, orders, categories, agencies] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { datePublished: 'desc' },
        include: {
          categories: true,
          agencies: true,
          status: true,
        },
      }),
      prisma.category.findMany({
        orderBy: { name: 'asc' }
      }),
      prisma.agency.findMany({
        orderBy: { name: 'asc' }
      }),
    ]);

    const response: OrdersResponse = {
      orders,
      metadata: {
        categories: categories.map(c => c.name),
        agencies: agencies.map(a => a.name),
        statuses: [] // Add statuses if needed
      },
      pagination: {
        page,
        limit,
        total: totalCount,
        hasMore: totalCount > page * limit,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error('Error in GET /api/orders:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch orders' }),
      { status: 500 }
    );
  }
}

/** POST /api/orders */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || !body.title) {
      return new Response(
        JSON.stringify({ error: 'Missing "title" in body' }),
        { status: 400 }
      );
    }

    // If user doesn't provide a valid DocumentType, default to EXECUTIVE_ORDER
    const docType = Object.values(DocumentType).includes(body.type) 
      ? body.type 
      : DocumentType.EXECUTIVE_ORDER;

    const orderData: OrderCreateInput = {
      type: docType,
      title: body.title,
      identifier: body.number ?? '',
      summary: body.summary ?? null,
      date: body.datePublished ? new Date(body.datePublished) : new Date(),
      url: body.link ?? null,
      statusId: '1', // Default status
      isNew: true,
      categories: body.categories ? {
        connectOrCreate: body.categories.map((name: string) => ({
          where: { name },
          create: { name },
        }))
      } : undefined,
      agencies: body.agencies ? {
        connectOrCreate: body.agencies.map((name: string) => ({
          where: { name },
          create: { name },
        }))
      } : undefined
    };

    const newOrder = await prisma.order.create({
      data: orderData as any, // Type assertion needed due to Prisma schema differences
      include: {
        categories: true,
        agencies: true,
        status: true,
      },
    });

    const response: QueryResult<typeof newOrder> = {
      success: true,
      data: newOrder
    };

    return new Response(
      JSON.stringify(response),
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error in POST /api/orders:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create order' }),
      { status: 500 }
    );
  }
}
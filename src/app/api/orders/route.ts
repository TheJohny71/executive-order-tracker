import { NextRequest } from 'next/server';
import { z } from 'zod';
import sanitize from 'sanitize-html';
import { prisma } from '@/lib/db';
import { DocumentType } from '@prisma/client';
import { logger } from '@/utils/logger';
import type { OrderWhereInput, WhereClause } from '@/types';

// Improved query schema with proper types
const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(10),
  search: z.string().trim().optional(),
  type: z.nativeEnum(DocumentType).optional(),
  category: z.string().optional(),
  agency: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  statusId: z.number().optional(),
});

const sanitizeOptions = {
  allowedTags: [],
  allowedAttributes: {},
};

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const rawParams = Object.fromEntries(url.searchParams.entries());
    
    const params = querySchema.parse(rawParams);
    const page = params.page;
    const limit = params.limit;
    const skip = (page - 1) * limit;

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

    if (params.dateFrom || params.dateTo) {
      where.datePublished = {};
      if (params.dateFrom) {
        where.datePublished.gte = new Date(params.dateFrom);
      }
      if (params.dateTo) {
        where.datePublished.lte = new Date(params.dateTo);
      }
    }

    if (params.statusId) {
      where.statusId = params.statusId;
    }

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

    return new Response(
      JSON.stringify({
        orders,
        metadata: {
          categories: categories.map(c => c.name),
          agencies: agencies.map(a => a.name),
        },
        pagination: {
          page,
          limit,
          total: totalCount,
          hasMore: totalCount > page * limit,
        },
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    logger.error('Error in GET /api/orders:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch orders' }),
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body?.title) {
      return new Response(
        JSON.stringify({ error: 'Missing title' }),
        { status: 400 }
      );
    }

    const orderData: OrderWhereInput = {
      type: body.type ?? DocumentType.EXECUTIVE_ORDER,
      title: body.title,
      summary: body.summary ?? null,
      date: body.datePublished ? new Date(body.datePublished) : new Date(),
      url: body.link ?? null,
      categories: body.categories ? {
        some: {
          name: body.categories[0]
        }
      } : undefined,
      agencies: body.agencies ? {
        some: {
          name: body.agencies[0]
        }
      } : undefined,
      statusId: body.statusId?.toString() ?? '1' // Default status
    };

    const newOrder = await prisma.order.create({
      data: orderData as any, // Type assertion needed due to Prisma type mismatch
      include: {
        categories: true,
        agencies: true,
        status: true,
      },
    });

    return new Response(
      JSON.stringify({ success: true, order: newOrder }),
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
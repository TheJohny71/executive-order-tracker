import { NextRequest } from 'next/server';
import { z } from 'zod';
import sanitize from 'sanitize-html';
import { prisma } from '@/lib/db';
import { DocumentType, Prisma } from '@prisma/client';
import { logger } from '@/utils/logger';
import type { WhereClause, OrderCreateInput } from '@/types';

// Improved query schema with proper types
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

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const rawParams = Object.fromEntries(url.searchParams.entries());
    
    const params = querySchema.parse(rawParams);
    const page = params.page;
    const limit = params.limit;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};
    
    if (params.search) {
      const s = sanitize(params.search, sanitizeOptions);
      where.OR = [
        { title: { contains: s, mode: 'insensitive' } },
        { summary: { contains: s, mode: 'insensitive' } },
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
          categories,
          agencies,
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

    const orderData: Prisma.OrderCreateInput = {
      type: body.type ?? DocumentType.EXECUTIVE_ORDER,
      title: body.title,
      identifier: body.identifier,
      summary: body.summary ?? null,
      datePublished: body.datePublished ? new Date(body.datePublished) : new Date(),
      link: body.link ?? null,
      categories: body.categories ? {
        connectOrCreate: body.categories.map((name: string) => ({
          where: { name },
          create: { name },
        })),
      } : undefined,
      agencies: body.agencies ? {
        connectOrCreate: body.agencies.map((name: string) => ({
          where: { name },
          create: { name },
        })),
      } : undefined,
      status: {
        connect: { id: 1 } // Default status
      }
    };

    const newOrder = await prisma.order.create({
      data: orderData,
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
import { NextRequest } from 'next/server';
import { DocumentType, Prisma } from '@prisma/client';
import { z } from 'zod';
import sanitize from 'sanitize-html';
import type { IOptions } from 'sanitize-html';

import { prisma } from '@/lib/db';
import type { WhereClause, OrderDbRecord, OrdersResponse, OrderStatus } from '@/types';
import { transformOrderRecord } from '@/utils';
import { logger } from '@/utils/logger';

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(10),
  search: z.string().trim().optional(),
  type: z.nativeEnum(DocumentType).optional(),
  category: z.string().optional(),
  agency: z.string().optional(),
});

const sanitizeOptions: IOptions = {
  allowedTags: [] as string[],
  allowedAttributes: {} as { [key: string]: string[] },
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
      where.categories = {
        some: {
          name: params.category
        }
      };
    }

    if (params.agency) {
      where.agencies = {
        some: {
          name: params.agency
        }
      };
    }

    const [totalCount, dbOrders, categories, agencies, statuses] = await Promise.all([
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
      prisma.status.findMany({
        orderBy: { name: 'asc' }
      })
    ]);

    const orders = dbOrders.map(order => transformOrderRecord(order as OrderDbRecord));

    const mappedStatuses: OrderStatus[] = statuses.map(s => ({
      id: s.id,
      name: s.name,
      color: null
    }));

    const response: OrdersResponse = {
      orders,
      metadata: {
        categories: categories.map(c => c.name),
        agencies: agencies.map(a => a.name),
        statuses: mappedStatuses
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
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    logger.error('Error in GET /api/orders:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch orders' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body || !body.title) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const orderData: Prisma.OrderCreateInput = {
      title: body.title,
      type: body.type ?? DocumentType.EXECUTIVE_ORDER,
      number: body.number ?? null,
      summary: body.summary ?? null,
      datePublished: body.datePublished ? new Date(body.datePublished) : new Date(),
      link: body.link ?? null,
      status: {
        connect: {
          id: body.statusId ?? 1
        }
      },
      categories: body.categories ? {
        connectOrCreate: body.categories.map((name: string) => ({
          where: { name },
          create: { name }
        }))
      } : undefined,
      agencies: body.agencies ? {
        connectOrCreate: body.agencies.map((name: string) => ({
          where: { name },
          create: { name }
        }))
      } : undefined,
    };

    const newOrder = await prisma.order.create({
      data: orderData,
      include: {
        categories: true,
        agencies: true,
        status: true,
      },
    });

    const transformedOrder = transformOrderRecord(newOrder as OrderDbRecord);

    return new Response(
      JSON.stringify({ 
        success: true, 
        order: transformedOrder 
      }),
      { 
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    logger.error('Error in POST /api/orders:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create order' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
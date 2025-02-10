import { NextRequest } from 'next/server';
import { z } from 'zod';
import sanitize from 'sanitize-html';
import { prisma } from '@/lib/db';
import { DocumentType } from '@prisma/client';
import { logger } from '@/utils/logger';
import { 
  WhereClause, 
  OrderDbRecord, 
  OrdersResponse,
  transformOrderRecord 
} from '@/types';

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
      where.type = params.type as DocumentType;
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

    const [totalCount, dbOrders, categories, agencies] = await Promise.all([
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
      orders: dbOrders.map(transformOrderRecord),
      metadata: {
        categories: categories.map(c => c.name),
        agencies: agencies.map(a => a.name),
        statuses: []
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || !body.title) {
      return new Response(
        JSON.stringify({ error: 'Missing "title" in body' }),
        { status: 400 }
      );
    }

    let docType: DocumentType = DocumentType.EXECUTIVE_ORDER;
    if (body.type && Object.values(DocumentType).includes(body.type)) {
      docType = body.type;
    }

    const newOrder = await prisma.order.create({
      data: {
        type: docType,
        title: body.title,
        number: body.number ?? null,
        summary: body.summary ?? null,
        datePublished: body.datePublished ? new Date(body.datePublished) : new Date(),
        link: body.link ?? null,

        categories: body.categories
          ? {
              connectOrCreate: body.categories.map((catName: string) => ({
                where: { name: catName },
                create: { name: catName },
              })),
            }
          : undefined,

        agencies: body.agencies
          ? {
              connectOrCreate: body.agencies.map((agencyName: string) => ({
                where: { name: agencyName },
                create: { name: agencyName },
              })),
            }
          : undefined,
      },
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
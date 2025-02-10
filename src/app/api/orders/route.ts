import { NextRequest } from 'next/server';
import { z } from 'zod';
import sanitize from 'sanitize-html';
import { prisma } from '@/lib/db';  // Remove DocumentType since it's not used
import { logger } from '@/utils/logger';

// Validate query params
const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(10),
  search: z.string().trim().optional(),
});

const sanitizeOptions = {
  allowedTags: [],
  allowedAttributes: {},
};

/** GET /api/orders */
export async function GET(req: NextRequest) {  // Changed from request to req since it's used
  try {
    const url = new URL(req.url);
    const rawParams = Object.fromEntries(url.searchParams.entries());
    const params = querySchema.parse(rawParams);

    const page = params.page;
    const limit = params.limit;
    const skip = (page - 1) * limit;

    // Build a 'where' object for Prisma
    const where: any = {};
    if (params.search) {
      const s = sanitize(params.search, sanitizeOptions);
      where.OR = [
        { title: { contains: s, mode: 'insensitive' } },
        { summary: { contains: s, mode: 'insensitive' } },
      ];
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

    const response = {
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
export async function POST(req: NextRequest) {  // Changed from request to req
  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.title) {
      return new Response(
        JSON.stringify({ error: 'Missing "title" in body' }),
        { status: 400 }
      );
    }

    const newOrder = await prisma.order.create({
      data: {
        type: body.type || 'EXECUTIVE_ORDER',  // Simplified type handling
        title: body.title,
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
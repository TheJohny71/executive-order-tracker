// File: src/app/api/orders/route.ts

import { NextRequest } from 'next/server';
import { z } from 'zod';
import sanitize from 'sanitize-html';
import { prisma, DocumentType } from '@/lib/db'; // We'll export DocumentType from db.ts (see below)
import { logger } from '@/utils/logger';

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
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const rawParams = Object.fromEntries(url.searchParams.entries());
    const params = querySchema.parse(rawParams);

    const page = params.page;
    const limit = params.limit;
    const skip = (page - 1) * limit;

    // Build a Prisma where object
    const where: any = {};
    if (params.search) {
      const s = sanitize(params.search, sanitizeOptions);
      where.OR = [
        { title: { contains: s, mode: 'insensitive' } },
        { summary: { contains: s, mode: 'insensitive' } },
      ];
    }

    // Query total count and actual results
    const [totalCount, orders] = await Promise.all([
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
    ]);

    const response = {
      totalCount,
      orders,
      pagination: {
        page,
        limit,
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
    // Parse JSON body
    const body = await request.json().catch(() => null);
    if (!body || !body.title) {
      return new Response(JSON.stringify({ error: 'Missing "title" in body' }), { status: 400 });
    }

    // If the user didn’t provide a valid DocumentType, default to EXECUTIVE_ORDER
    let docType: DocumentType = DocumentType.EXECUTIVE_ORDER;
    if (body.type && Object.values(DocumentType).includes(body.type)) {
      docType = body.type;
    }

    const newOrder = await prisma.order.create({
      data: {
        type: docType,
        title: body.title,
        summary: body.summary ?? null,
        datePublished: body.datePublished ? new Date(body.datePublished) : new Date(),
        link: body.link ?? null,

        // categories: connectOrCreate if provided
        categories: body.categories
          ? {
              connectOrCreate: body.categories.map((catName: string) => ({
                where: { name: catName },
                create: { name: catName },
              })),
            }
          : undefined,

        // agencies: connectOrCreate if provided
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

    return new Response(JSON.stringify({ success: true, order: newOrder }), {
      status: 201,
    });
  } catch (error) {
    logger.error('Error in POST /api/orders:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create order' }),
      { status: 500 }
    );
  }
}

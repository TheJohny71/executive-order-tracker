import { Prisma, DocumentType } from '@prisma/client';
import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { logger } from '@/utils/logger';
import type { OrdersResponse, WhereClause, OrderByClause } from '@/types';
import { prisma } from '@/lib/prisma';
import sanitize from 'sanitize-html';

// Input validation schema
const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(10),
  search: z.string().trim().optional(),
  type: z.nativeEnum(DocumentType).optional(),
  category: z.string().trim().optional(),
  agency: z.string().trim().optional(),
  statusId: z.coerce.number().optional(),
  sort: z.string().regex(/^-?(datePublished|title|type|createdAt)$/).default('-datePublished'),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

const sanitizeOptions = {
  allowedTags: [],
  allowedAttributes: {},
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());
    
    // Validate and parse query parameters
    const validatedParams = querySchema.parse(params);
    
    // Build the where clause
    const where: WhereClause = {};
    
    if (validatedParams.type) {
      where.type = validatedParams.type;
    }
    
    if (validatedParams.statusId) {
      where.statusId = validatedParams.statusId;
    }
    
    if (validatedParams.category) {
      const sanitizedCategory = sanitize(validatedParams.category, sanitizeOptions);
      where.category = {
        equals: sanitizedCategory,
        mode: 'insensitive'
      };
    }
    
    if (validatedParams.agency) {
      const sanitizedAgency = sanitize(validatedParams.agency, sanitizeOptions);
      where.agency = {
        equals: sanitizedAgency,
        mode: 'insensitive'
      };
    }
    
    if (validatedParams.dateFrom || validatedParams.dateTo) {
      where.datePublished = {
        ...(validatedParams.dateFrom && { gte: new Date(validatedParams.dateFrom) }),
        ...(validatedParams.dateTo && { lte: new Date(validatedParams.dateTo) })
      };
    }
    
    if (validatedParams.search) {
      const sanitizedSearch = sanitize(validatedParams.search, sanitizeOptions);
      where.OR = [
        { title: { contains: sanitizedSearch, mode: 'insensitive' } },
        { summary: { contains: sanitizedSearch, mode: 'insensitive' } },
        { number: { contains: sanitizedSearch, mode: 'insensitive' } }
      ];
    }

    // Build the order by clause
    const sortField = validatedParams.sort.startsWith('-') 
      ? validatedParams.sort.slice(1) 
      : validatedParams.sort;
    const sortDirection = validatedParams.sort.startsWith('-') ? 'desc' : 'asc';
    const orderBy: OrderByClause = { [sortField]: sortDirection };

    // Execute database queries in parallel
    const [totalCount, ordersResult, categories, agencies, statuses] = await Promise.all([
      prisma.order.count({ 
        where: where as Prisma.OrderWhereInput 
      }),
      prisma.order.findMany({
        where: where as Prisma.OrderWhereInput,
        orderBy: orderBy as Prisma.OrderOrderByWithRelationInput,
        skip: (validatedParams.page - 1) * validatedParams.limit,
        take: validatedParams.limit,
        include: {
          status: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }),
      prisma.category.findMany({
        select: { name: true },
        orderBy: { name: 'asc' }
      }),
      prisma.agency.findMany({
        select: { name: true },
        orderBy: { name: 'asc' }
      }),
      prisma.status.findMany({
        select: {
          id: true,
          name: true
        },
        orderBy: { name: 'asc' }
      })
    ]);

    // Prepare the response
    const response: OrdersResponse = {
      orders: ordersResult,
      pagination: {
        total: totalCount,
        page: validatedParams.page,
        limit: validatedParams.limit,
        hasMore: totalCount > validatedParams.page * validatedParams.limit
      },
      metadata: {
        categories: categories.map(c => c.name),
        agencies: agencies.map(a => a.name),
        statuses
      }
    };

    return Response.json(response);

  } catch (error) {
    logger.error('Error in GET /api/orders:', error);
    
    if (error instanceof z.ZodError) {
      return Response.json(
        { 
          error: 'Invalid query parameters',
          details: error.errors 
        }, 
        { status: 400 }
      );
    }
    
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return Response.json(
      { 
        error: 'Failed to fetch orders',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined 
      }, 
      { status: 500 }
    );
  }
}

// Since we're not using the request parameter in POST, we can remove it
export async function POST() {
  return Response.json(
    { error: 'Method not implemented' },
    { status: 501 }
  );
}
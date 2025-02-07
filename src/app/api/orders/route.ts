// src/app/api/orders/route.ts
import { PrismaClient, DocumentType } from '@prisma/client';
import { type NextRequest } from 'next/server';
import { logger } from '@/utils/logger';
import { OrderFilters, WhereClause, OrderByClause } from '@/types';
import type { Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const typeParam = searchParams.get('type');
    const type = typeParam && Object.values(DocumentType).includes(typeParam as DocumentType) 
      ? typeParam as DocumentType 
      : '';
    
    const filters: OrderFilters = {
      type,
      category: searchParams.get('category') || '',
      agency: searchParams.get('agency') || '',
      search: searchParams.get('search') || '',
      dateFrom: searchParams.get('dateFrom') || '',
      dateTo: searchParams.get('dateTo') || '',
      page: parseInt(searchParams.get('page') || '1', 10),
      limit: parseInt(searchParams.get('limit') || '10', 10),
      statusId: searchParams.get('statusId') ? parseInt(searchParams.get('statusId')!, 10) : undefined,
      sort: searchParams.get('sort') as OrderFilters['sort'] || undefined
    };

    const where: Prisma.OrderWhereInput = {};
    const orderBy: Prisma.OrderOrderByWithRelationInput = {};

    // Handle sorting
    if (filters.sort) {
      const [field, direction] = filters.sort.startsWith('-') 
        ? [filters.sort.slice(1), 'desc' as const] 
        : [filters.sort, 'asc' as const];
      
      // Validate the field is a valid Order property
      const validFields = ['datePublished', 'number', 'title', 'createdAt', 'updatedAt'];
      if (validFields.includes(field)) {
        orderBy[field as keyof typeof orderBy] = direction;
      }
    } else {
      orderBy.datePublished = 'desc';
    }

    // Apply type filter
    if (filters.type) {
      where.type = filters.type;
    }

    // Apply category filter
    if (filters.category) {
      where.category = {
        equals: filters.category,
        mode: 'insensitive'
      };
    }

    // Apply agency filter
    if (filters.agency) {
      where.agency = {
        equals: filters.agency,
        mode: 'insensitive'
      };
    }

    // Apply status filter
    if (filters.statusId) {
      where.statusId = filters.statusId;
    }

    // Apply date filters
    if (filters.dateFrom || filters.dateTo) {
      where.datePublished = {};
      if (filters.dateFrom) {
        where.datePublished.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.datePublished.lte = new Date(filters.dateTo);
      }
    }

    // Apply search filter
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { summary: { contains: filters.search, mode: 'insensitive' } },
        { number: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    try {
      // Execute database queries in parallel
      const [total, orders, categories, agencies, statuses] = await Promise.all([
        prisma.order.count({ where }),
        prisma.order.findMany({
          where,
          orderBy,
          skip: (filters.page - 1) * filters.limit,
          take: filters.limit,
          include: {
            status: true
          }
        }),
        prisma.category.findMany({ 
          orderBy: { name: 'asc' },
          select: { name: true }
        }),
        prisma.agency.findMany({ 
          orderBy: { name: 'asc' },
          select: { name: true }
        }),
        prisma.status.findMany({ 
          orderBy: { name: 'asc' },
          select: { id: true, name: true }
        })
      ]);

      return new Response(JSON.stringify({
        orders,
        pagination: {
          total,
          page: filters.page,
          limit: filters.limit,
          hasMore: total > filters.page * filters.limit
        },
        metadata: {
          categories: categories.map(c => c.name),
          agencies: agencies.map(a => a.name),
          statuses: statuses
        }
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=59'
        }
      });
    } catch (dbError) {
      logger.error('Database query error:', dbError);
      throw new Error('Database query failed');
    }
  } catch (error) {
    logger.error('Error fetching orders:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch orders',
      details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(request: NextRequest) {
  return new Response(JSON.stringify({ error: 'Method not implemented' }), {
    status: 501,
    headers: { 'Content-Type': 'application/json' }
  });
}
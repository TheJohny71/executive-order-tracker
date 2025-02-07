import { PrismaClient, DocumentType } from '@prisma/client';
import { type NextRequest } from 'next/server';
import { logger } from '@/utils/logger';
import { OrderFilters, WhereClause, OrderByClause } from '@/types';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') as DocumentType | '';
    
    const filters: OrderFilters = {
      type: type || '',
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

    const where: WhereClause = {};
    const orderBy: OrderByClause = {};

    // Handle sorting
    if (filters.sort) {
      const [field, direction] = filters.sort.startsWith('-') 
        ? [filters.sort.slice(1), 'desc' as const] 
        : [filters.sort, 'asc' as const];
      orderBy[field as keyof OrderByClause] = direction;
    } else {
      orderBy.datePublished = 'desc';
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.category) {
      where.category = {
        equals: filters.category,
        mode: 'insensitive'
      };
    }

    if (filters.agency) {
      where.agency = {
        equals: filters.agency,
        mode: 'insensitive'
      };
    }

    if (filters.statusId) {
      where.statusId = filters.statusId;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.datePublished = {};
      if (filters.dateFrom) {
        where.datePublished.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.datePublished.lte = new Date(filters.dateTo);
      }
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { summary: { contains: filters.search, mode: 'insensitive' } },
        { number: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        orderBy,
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        include: {
          status: true
        }
      })
    ]);

    const [categories, agencies, statuses] = await Promise.all([
      prisma.category.findMany(),
      prisma.agency.findMany(),
      prisma.status.findMany()
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
        statuses: statuses.map(s => ({ id: s.id, name: s.name }))
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    logger.error('Error fetching orders:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch orders' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
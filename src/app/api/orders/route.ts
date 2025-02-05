import { PrismaClient, DocumentType } from '@prisma/client';
import { type NextRequest } from 'next/server';
import { logger } from '@/utils/logger';
import { OrderFilters, WhereClause } from '@/types';

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
      limit: parseInt(searchParams.get('limit') || '10', 10)
    };

    const where: WhereClause = {};

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.agency) {
      where.agency = filters.agency;
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
        { summary: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        orderBy: { datePublished: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        include: {
          status: true
        }
      })
    ]);

    const metadata = await Promise.all([
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
        categories: metadata[0].map(c => c.name),
        agencies: metadata[1].map(a => a.name),
        statuses: metadata[2].map(s => ({ id: s.id, name: s.name }))
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
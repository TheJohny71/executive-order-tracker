// src/app/api/orders/route.ts

import { PrismaClient, DocumentType } from '@prisma/client';
import { type NextRequest } from 'next/server';
import { logger } from '@/utils/logger';
import { OrderFilters, WhereClause } from '@/types';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const typeParam = searchParams.get('type');
  
  const filters: OrderFilters = {
    type: typeParam ? typeParam as DocumentType : '',
    category: searchParams.get('category') || '',
    agency: searchParams.get('agency') || '',
    search: searchParams.get('search') || '',
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || '',
    page: parseInt(searchParams.get('page') || '1', 10),
    limit: parseInt(searchParams.get('limit') || '10', 10),
    statusId: searchParams.get('statusId') || undefined,
    sort: (searchParams.get('sort') as OrderFilters['sort']) || undefined
  };

  const where: WhereClause = {};

  if (filters.type && Object.values(DocumentType).includes(filters.type)) {
    where.type = filters.type;
  }

  if (filters.category) {
    where.categories = {
      some: { name: filters.category }
    };
  }

  if (filters.agency) {
    where.agencies = {
      some: { name: filters.agency }
    };
  }

  if (filters.search) {
    where.title = {
      contains: filters.search,
      mode: 'insensitive'
    };
  }

  if (filters.statusId) {
    where.statusId = filters.statusId;
  }

  if (filters.dateFrom || filters.dateTo) {
    where.date = {};
    if (filters.dateFrom) {
      where.date.gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      where.date.lte = new Date(filters.dateTo);
    }
  }

  const skip = (filters.page - 1) * filters.limit;

  try {
    const [total, orders, categories, agencies, statuses] = await Promise.all([
      prisma.executiveOrder.count({ where }),
      prisma.executiveOrder.findMany({
        where,
        include: {
          status: true,
          categories: true,
          agencies: true,
          citations: true,
          amendments: true
        },
        skip,
        take: filters.limit,
        orderBy: filters.sort ? {
          [filters.sort.replace(/^-/, '')]: filters.sort.startsWith('-') ? 'desc' : 'asc'
        } : { date: 'desc' }
      }),
      prisma.category.findMany({ select: { name: true } }),
      prisma.agency.findMany({ select: { name: true } }),
      prisma.status.findMany({ select: { id: true, name: true } })
    ]);

    return Response.json({
      orders,
      pagination: {
        total,
        page: filters.page,
        limit: filters.limit,
        hasMore: total > skip + orders.length
      },
      metadata: {
        categories: categories.map(c => c.name),
        agencies: agencies.map(a => a.name),
        statuses
      }
    });

  } catch (error) {
    logger.error({ error }, 'Error fetching orders');
    if (error instanceof Error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
    return Response.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
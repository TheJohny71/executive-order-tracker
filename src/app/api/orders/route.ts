// src/app/api/orders/route.ts

import { PrismaClient, DocumentType } from '@prisma/client';
import { type NextRequest } from 'next/server';
import { logger } from '@/utils/logger';
import { OrderFilters } from '@/types';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  const filters: OrderFilters = {
    type: searchParams.get('type') ? searchParams.get('type') as DocumentType : '',
    category: searchParams.get('category') || '',
    agency: searchParams.get('agency') || '',
    search: searchParams.get('search') || '',
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || '',
    page: parseInt(searchParams.get('page') || '1', 10),
    limit: parseInt(searchParams.get('limit') || '10', 10),
    statusId: searchParams.get('statusId') || undefined
  };

  const where: any = {}; // We'll type this properly after setting the conditions

  // Only add type filter if a valid type is provided
  if (filters.type && Object.values(DocumentType).includes(filters.type as DocumentType)) {
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
    const total = await prisma.executiveOrder.count({ where });

    const orders = await prisma.executiveOrder.findMany({
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
      orderBy: { date: 'desc' }
    });

    // Fetch metadata in parallel
    const [categories, agencies, statuses] = await Promise.all([
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
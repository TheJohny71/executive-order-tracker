import { Prisma, DocumentType } from '@prisma/client';
import { type NextRequest } from 'next/server';
import { logger } from '@/utils/logger';
import type { OrdersResponse, WhereClause, OrderByClause } from '@/types';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const limit = Math.max(1, Math.min(50, Number(searchParams.get('limit')) || 10));
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') as DocumentType | undefined;
    const category = searchParams.get('category') || undefined;
    const agency = searchParams.get('agency') || undefined;
    const statusId = searchParams.get('statusId') ? Number(searchParams.get('statusId')) : undefined;
    const sort = searchParams.get('sort') || '-datePublished';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    const where: WhereClause = {};
    
    if (type) where.type = type;
    if (statusId) where.statusId = statusId;
    if (category) {
      where.category = {
        equals: category,
        mode: 'insensitive'
      };
    }
    if (agency) {
      where.agency = {
        equals: agency,
        mode: 'insensitive'
      };
    }
    
    if (dateFrom || dateTo) {
      where.datePublished = {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo) })
      };
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } },
        { number: { contains: search, mode: 'insensitive' } }
      ];
    }

    const sortField = sort.startsWith('-') ? sort.slice(1) : sort;
    const sortDirection = sort.startsWith('-') ? 'desc' as const : 'asc' as const;
    const orderBy: OrderByClause = { [sortField]: sortDirection };

    const [totalCount, ordersResult, categories, agencies, statuses] = await Promise.all([
      prisma.order.count({ where: where as Prisma.OrderWhereInput }),
      prisma.order.findMany({
        where: where as Prisma.OrderWhereInput,
        orderBy: orderBy as Prisma.OrderOrderByWithRelationInput,
        skip: (page - 1) * limit,
        take: limit,
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

    const response: OrdersResponse = {
      orders: ordersResult,
      pagination: {
        total: totalCount,
        page,
        limit,
        hasMore: totalCount > page * limit
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
    return Response.json(
      { 
        error: 'Failed to fetch orders',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      }, 
      { status: 500 }
    );
  }
}

export async function POST() {
  return Response.json(
    { error: 'Method not implemented' },
    { status: 501 }
  );
}
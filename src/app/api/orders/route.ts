import { PrismaClient, Prisma, DocumentType } from '@prisma/client';
import { type NextRequest } from 'next/server';
import { logger } from '@/utils/logger';

const db = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Simple parameter extraction with defaults
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const limit = Math.max(1, Math.min(50, Number(searchParams.get('limit')) || 10));
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') as DocumentType | undefined;
    const category = searchParams.get('category') || undefined;
    const agency = searchParams.get('agency') || undefined;
    const statusId = searchParams.get('statusId') || undefined;
    const sort = searchParams.get('sort') || '-datePublished';

    // Build where clause
    const where: Prisma.OrderWhereInput = {};
    
    if (type) where.type = type;
    if (statusId) where.statusId = Number(statusId);
    if (category) where.category = category;
    if (agency) where.agency = agency;
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } },
        { number: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Build order by
    const [sortField, sortDirection] = sort.startsWith('-') 
      ? [sort.slice(1), 'desc' as const] 
      : [sort, 'asc' as const];

    const orderBy: Prisma.OrderOrderByWithRelationInput = {
      [sortField === 'date' ? 'datePublished' : 'createdAt']: sortDirection
    };

    // Execute queries
    const [totalCount, ordersResult, categoriesResult, agenciesResult, statusesResult] = await Promise.all([
      db.order.count({ where }),
      db.order.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          status: true
        }
      }),
      db.category.findMany({
        select: { name: true },
        orderBy: { name: 'asc' }
      }),
      db.agency.findMany({
        select: { name: true },
        orderBy: { name: 'asc' }
      }),
      db.status.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
      })
    ]);

    return Response.json({
      orders: ordersResult,
      pagination: {
        total: totalCount,
        page,
        limit,
        hasMore: totalCount > page * limit
      },
      metadata: {
        categories: categoriesResult.map(c => c.name),
        agencies: agenciesResult.map(a => a.name),
        statuses: statusesResult
      }
    });

  } catch (error) {
    logger.error('Error in GET /api/orders:', error);
    return Response.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  } finally {
    await db.$disconnect();
  }
}

export async function POST() {
  return Response.json(
    { error: 'Method not implemented' },
    { status: 501 }
  );
}
import { PrismaClient } from '@prisma/client';
import { type NextRequest } from 'next/server';
import { logger } from '@/utils/logger';

const db = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Simple parameter extraction with defaults
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const limit = Math.max(1, Math.min(50, Number(searchParams.get('limit')) || 10));
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || undefined;
    const category = searchParams.get('category') || undefined;
    const agency = searchParams.get('agency') || undefined;
    const statusId = searchParams.get('statusId') || undefined;
    const sort = searchParams.get('sort') || '-date';

    // Build where clause
    const where: Record<string, unknown> = {};
    
    if (type) where.type = type;
    if (statusId) where.statusId = statusId;
    
    if (category) {
      where.category = {
        some: { name: { equals: category, mode: 'insensitive' } }
      };
    }
    
    if (agency) {
      where.agency = {
        some: { name: { equals: agency, mode: 'insensitive' } }
      };
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } },
        { identifier: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Build order by
    const [sortField, sortDirection] = sort.startsWith('-') 
      ? [sort.slice(1), 'desc'] 
      : [sort, 'asc'];

    const orderBy: Record<string, string> = {
      [sortField === 'date' ? 'date' : 'createdAt']: sortDirection
    };

    // Execute queries
    const [total, orders, categories, agencies, statuses] = await Promise.all([
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
      orders,
      pagination: {
        total,
        page,
        limit,
        hasMore: total > page * limit
      },
      metadata: {
        categories: categories.map(c => c.name),
        agencies: agencies.map(a => a.name),
        statuses
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
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import pino from 'pino';
import pretty from 'pino-pretty';

const prisma = new PrismaClient();
const logger = pino(pretty({ colorize: true }));

export const runtime = 'nodejs';
export const preferredRegion = 'auto';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    const type = searchParams.get('type');
    const category = searchParams.get('category');
    const agency = searchParams.get('agency');
    const search = searchParams.get('search');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Build where clause for filtering
    const where: any = {};

    if (type && type !== 'all') {
      where.type = type;
    }

    if (category && category !== 'all') {
      where.categories = {
        some: {
          name: category
        }
      };
    }

    if (agency && agency !== 'all') {
      where.agencies = {
        some: {
          name: agency
        }
      };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }

    // Get total count for pagination
    const total = await prisma.executiveOrder.count({ where });

    // Fetch orders with pagination
    const orders = await prisma.executiveOrder.findMany({
      where,
      include: {
        categories: true,
        agencies: true
      },
      orderBy: {
        date: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    });

    return NextResponse.json({
      orders,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
        limit
      }
    });

  } catch (error) {
    logger.error({ error }, 'Error fetching orders');
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { orderId } = await request.json();

    await prisma.executiveOrder.update({
      where: { id: orderId },
      data: { isNew: false }
    });

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    logger.error({ error }, 'Error updating order');
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}
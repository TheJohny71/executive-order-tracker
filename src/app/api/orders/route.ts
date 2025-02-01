// src/app/api/orders/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import pino from 'pino';
import pretty from 'pino-pretty';

const prisma = new PrismaClient();
const logger = pino(pretty({ colorize: true }));

export const runtime = 'nodejs';
export const preferredRegion = 'auto';

interface WhereClause {
  type?: string;
  date?: {
    gte?: Date;
    lte?: Date;
  };
  OR?: Array<{
    title: { contains: string; mode: string };
    summary: { contains: string; mode: string };
  }>;
  categories?: {
    some: { name: string };
  };
  agencies?: {
    some: { name: string };
  };
}

interface Category {
  name: string;
}

interface Agency {
  name: string;
}

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

    const where: WhereClause = {};

    if (type) {
      where.type = type;
    }

    if (category) {
      where.categories = {
        some: { name: category }
      };
    }

    if (agency) {
      where.agencies = {
        some: { name: agency }
      };
    }

    if (search) {
      where.OR = [
        { 
          title: { contains: search, mode: 'insensitive' },
          summary: { contains: search, mode: 'insensitive' }
        }
      ];
    }

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }

    const total = await prisma.executiveOrder.count({ where });

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

    const [categories, agencies] = await Promise.all([
      prisma.category.findMany(),
      prisma.agency.findMany()
    ]);

    return NextResponse.json({
      orders,
      metadata: {
        categories: categories.map((c: Category) => c.name),
        agencies: agencies.map((a: Agency) => a.name)
      },
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
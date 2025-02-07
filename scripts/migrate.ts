import { PrismaClient } from '@prisma/client';

interface Category {
  id: number;
  name: string;
}

interface Agency {
  id: number;
  name: string;
}

interface ExecutiveOrder {
  id: number;
  number: string | null;
  title: string;
  summary: string | null;
  datePublished: Date | null;
  link: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

async function main() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Starting migration...');

    // 1. First, let's get all existing data
    console.log('Fetching existing data...');
    const executiveOrders = await prisma.$queryRaw<ExecutiveOrder[]>`
      SELECT * FROM "ExecutiveOrder"
    `;
    console.log(`Found ${executiveOrders.length} executive orders`);

    // Create new tables first
    console.log('Creating Status table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Status" (
        "id" SERIAL PRIMARY KEY,
        "name" TEXT UNIQUE NOT NULL
      )
    `;

    console.log('Creating Order table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Order" (
        "id" SERIAL PRIMARY KEY,
        "type" TEXT NOT NULL,
        "number" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "summary" TEXT NOT NULL,
        "datePublished" TIMESTAMP(3) NOT NULL,
        "category" TEXT NOT NULL,
        "agency" TEXT,
        "statusId" INTEGER NOT NULL,
        "link" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        FOREIGN KEY ("statusId") REFERENCES "Status"("id")
      )
    `;

    console.log('Creating indexes...');
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Order_category_idx" ON "Order"("category")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Order_agency_idx" ON "Order"("agency")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Order_datePublished_idx" ON "Order"("datePublished")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Order_statusId_idx" ON "Order"("statusId")`;

    // Create default status
    console.log('Creating default status...');
    const statusResult = await prisma.$queryRaw<{ id: number }[]>`
      INSERT INTO "Status" ("name")
      VALUES ('Active')
      ON CONFLICT (name) DO UPDATE SET name = 'Active'
      RETURNING id
    `;
    
    const statusId = statusResult[0].id;
    console.log('Created default status with ID:', statusId);

    // Migrate the data
    console.log('Migrating data...');
    for (const order of executiveOrders) {
      // Log the order we're processing
      console.log('Processing order:', order);

      // Get connected agencies
      const agencies = await prisma.$queryRaw<Agency[]>`
        SELECT a.name 
        FROM "Agency" a 
        JOIN "_AgencyToExecutiveOrder" ae ON a.id = ae."A" 
        WHERE ae."B" = ${order.id}
      `;
      
      // Get connected categories
      const categories = await prisma.$queryRaw<Category[]>`
        SELECT c.name 
        FROM "Category" c 
        JOIN "_CategoryToExecutiveOrder" ce ON c.id = ce."A" 
        WHERE ce."B" = ${order.id}
      `;

      // Generate a fallback number if none exists
      const orderNumber = order.number || `EO-${order.id}`;

      // Ensure summary has a value
      const summary = order.summary || order.title || 'No summary provided';

      // Insert into new Order table
      await prisma.$executeRaw`
        INSERT INTO "Order" (
          "type",
          "number",
          "title",
          "summary",
          "datePublished",
          "category",
          "agency",
          "statusId",
          "link",
          "createdAt",
          "updatedAt"
        ) VALUES (
          'EXECUTIVE_ORDER',
          ${orderNumber},
          ${order.title},
          ${summary},
          ${order.datePublished || new Date()},
          ${categories[0]?.name || 'Uncategorized'},
          ${agencies[0]?.name || null},
          ${statusId},
          ${order.link || null},
          ${order.createdAt || new Date()},
          ${order.updatedAt || new Date()}
        )
      `;
      console.log(`Migrated order ${orderNumber}`);
    }

    console.log('Migration completed successfully!');

  } catch (error) {
    console.error('Migration failed:', error);
    // Log the full error details
    console.error('Full error:', JSON.stringify(error, null, 2));
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
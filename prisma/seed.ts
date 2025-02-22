import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create Status
  const status = await prisma.status.upsert({
    where: { name: 'Active' },
    update: {},
    create: {
      name: 'Active'
    }
  });

  // Create initial Category
  const category = await prisma.category.upsert({
    where: { name: 'General' },
    update: {},
    create: {
      name: 'General'
    }
  });

  // Create initial Agency
  const agency = await prisma.agency.upsert({
    where: { name: 'Department of State' },
    update: {},
    create: {
      name: 'Department of State'
    }
  });

  console.log({ status, category, agency });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

export {};

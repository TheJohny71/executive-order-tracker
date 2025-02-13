// scripts/init.ts

import { PrismaClient, DocumentType } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();

  try {
    console.log("Creating initial data...");

    // Create a Status row
    const status = await prisma.status.create({
      data: {
        name: "Active",
      },
    });
    console.log("Created status:", status);

    // Create a sample Order
    //
    // OLD (broken):
    // category: 'General',
    // agency: 'Department of State',
    //
    // NEW (fixed):
    // categories: { connectOrCreate: [...] }
    // agencies:   { connectOrCreate: [...] }

    const order = await prisma.order.create({
      data: {
        type: DocumentType.EXECUTIVE_ORDER,
        number: "EO-2025-001",
        title: "Sample Executive Order",
        summary: "This is a sample executive order.",
        datePublished: new Date(),
        link: null,

        statusId: status.id,

        // Attach 1 category named "General"
        categories: {
          connectOrCreate: [
            {
              where: { name: "General" },
              create: { name: "General" },
            },
          ],
        },
        // Attach 1 agency named "Department of State"
        agencies: {
          connectOrCreate: [
            {
              where: { name: "Department of State" },
              create: { name: "Department of State" },
            },
          ],
        },
      },
    });

    console.log("Created sample order:", order);
    console.log("Initial data created successfully!");
  } catch (error) {
    console.error("Failed to create initial data:", error);
    throw error;
  } finally {
    // Always disconnect from Prisma at the end
    await new PrismaClient().$disconnect();
  }
}

// Run the main() function, handle errors
main().catch((e) => {
  console.error(e);
  process.exit(1);
});

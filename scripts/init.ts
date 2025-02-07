import { PrismaClient } from '@prisma/client'

async function main() {
  const prisma = new PrismaClient()
  
  try {
    console.log('Creating initial data...')

    // Create Status
    const status = await prisma.status.create({
      data: {
        name: 'Active'
      }
    })
    console.log('Created status:', status)

    // Create a sample order
    const order = await prisma.order.create({
      data: {
        type: 'EXECUTIVE_ORDER',
        number: 'EO-2025-001',
        title: 'Sample Executive Order',
        summary: 'This is a sample executive order.',
        datePublished: new Date(),
        category: 'General',
        agency: 'Department of State',
        statusId: status.id,
        link: null
      }
    })
    console.log('Created sample order:', order)

    console.log('Initial data created successfully!')

  } catch (error) {
    console.error('Failed to create initial data:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
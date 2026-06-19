const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  try {
    const t = await db.tournament.create({
      data: {
        name: 'Test Tournament Creation Direct',
        slug: 'test-tournament-creation-direct-' + Date.now(),
        entryFee: 50000,
        categoryFees: null,
        capacity: 999999,
        isOpen: true,
        formSchema: '[]',
      }
    });
    console.log('Successfully created:', t);
  } catch (err) {
    console.error('Error creating tournament:', err);
  } finally {
    await db.$disconnect();
  }
}
main();

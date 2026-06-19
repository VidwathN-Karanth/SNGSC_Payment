const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@chesstournament.com';
  const password = process.env.ADMIN_PASSWORD || 'adminpassword123';

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Seed or update the AdminUser
  const admin = await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash },
  });

  console.log(`[SEED] Admin User seeded: ${admin.email}`);

  // Create a sample tournament if none exist
  const tournamentCount = await prisma.tournament.count();
  if (tournamentCount === 0) {
    const sampleTournament = await prisma.tournament.create({
      data: {
        name: 'Summer Chess Championship 2026',
        slug: 'summer-championship-2026',
        entryFee: 50000, // 500.00 INR in paise
        capacity: 50, // Test limit
        isOpen: true,
        formSchema: JSON.stringify([
          { key: 'fideId', label: 'FIDE ID (optional)', type: 'text', required: false },
          {
            key: 'ageCategory',
            label: 'Age Category',
            type: 'select',
            options: ['Under 9', 'Under 13', 'Under 17', 'Open Group'],
            required: true
          },
          { key: 'city', label: 'City / State', type: 'text', required: true }
        ])
      }
    });
    console.log(`[SEED] Sample Tournament seeded: ${sampleTournament.name} (${sampleTournament.slug})`);
  } else {
    console.log('[SEED] Tournaments already exist. Skipping sample creation.');
  }
}

main()
  .catch((e) => {
    console.error('[SEED] Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

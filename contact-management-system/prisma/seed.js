import bcrypt from 'bcryptjs';
import prisma from '../src/config/db.js';

/**
 * Seed script for Contact Management System.
 * Populates sample users and owner-scoped contacts for manual and demonstration testing.
 */
async function main() {
  console.log('Seeding Contact Management System database...');

  // Hash password for seed users
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Password123!', salt);

  // Clean existing seed data if any
  const seedEmails = ['avishek@example.com', 'priya@example.com'];
  for (const email of seedEmails) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      await prisma.user.delete({ where: { id: existing.id } });
    }
  }

  // Create User 1: Avishek
  const user1 = await prisma.user.create({
    data: {
      name: 'Avishek Mukherjee',
      email: 'avishek@example.com',
      passwordHash
    }
  });
  console.log(`Created User 1: ${user1.email} (${user1.id})`);

  // Create User 2: Priya
  const user2 = await prisma.user.create({
    data: {
      name: 'Priya Roy',
      email: 'priya@example.com',
      passwordHash
    }
  });
  console.log(`Created User 2: ${user2.email} (${user2.id})`);

  // Create Contacts for User 1
  const user1Contacts = [
    {
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+15551234567',
      companyName: 'TechCorp',
      jobTitle: 'Senior Software Engineer',
      addressLine1: '100 Market St',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94105',
      country: 'USA',
      notes: 'Met at Developer Conference 2026'
    },
    {
      name: 'Jane Smith',
      email: 'jane.smith@designco.com',
      phone: '+15559876543',
      companyName: 'DesignCo',
      jobTitle: 'Principal Product Designer',
      addressLine1: '250 Broadway',
      city: 'New York',
      state: 'NY',
      postalCode: '10007',
      country: 'USA',
      notes: 'UI/UX collaborator'
    },
    {
      name: 'Rahul Sharma',
      email: 'rahul.sharma@innovate.in',
      phone: '+919876543210',
      companyName: 'InnovateLabs',
      jobTitle: 'Engineering Manager',
      addressLine1: 'Salt Lake Sector V',
      city: 'Kolkata',
      state: 'West Bengal',
      postalCode: '700091',
      country: 'India',
      notes: 'Backend consultant'
    },
    {
      name: 'Alice Brown',
      email: null,
      phone: '+15553332211',
      companyName: 'TechCorp',
      jobTitle: 'QA Lead',
      city: 'Austin',
      state: 'TX',
      postalCode: '78701',
      country: 'USA',
      notes: 'Phone-only contact'
    },
    {
      name: 'Carlos Garcia',
      email: 'carlos.garcia@global.es',
      phone: null,
      companyName: 'Global Logistics',
      jobTitle: 'Logistics Director',
      city: 'Madrid',
      state: 'Madrid',
      postalCode: '28001',
      country: 'Spain',
      notes: 'Email-only contact'
    }
  ];

  for (const c of user1Contacts) {
    await prisma.contact.create({
      data: {
        ...c,
        ownerId: user1.id
      }
    });
  }
  console.log(`Seeded ${user1Contacts.length} contacts for ${user1.name}`);

  // Create Contacts for User 2 (including same email as User 1's contact to demonstrate isolation)
  const user2Contacts = [
    {
      name: 'John Doe',
      email: 'john.doe@example.com', // Allowed: owned by user2, not user1
      phone: '+15550001111',
      companyName: 'TechCorp',
      jobTitle: 'Advisor',
      city: 'San Francisco',
      country: 'USA'
    },
    {
      name: 'Amit Patel',
      email: 'amit.patel@startup.in',
      phone: '+919123456789',
      companyName: 'FinTech Hub',
      jobTitle: 'Founder & CEO',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560001',
      country: 'India'
    }
  ];

  for (const c of user2Contacts) {
    await prisma.contact.create({
      data: {
        ...c,
        ownerId: user2.id
      }
    });
  }
  console.log(`Seeded ${user2Contacts.length} contacts for ${user2.name}`);

  console.log('Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    if (prisma.$disconnect) {
      await prisma.$disconnect();
    }
  });

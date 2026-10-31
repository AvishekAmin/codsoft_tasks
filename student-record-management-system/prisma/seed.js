import bcrypt from 'bcryptjs';
import prisma from '../src/config/db.js';
import env from '../src/config/env.js';

/**
 * Idempotent seed script to initialize or update the system administrator account.
 */
export const seedAdmin = async () => {
  const adminEmail = env.ADMIN_EMAIL.toLowerCase().trim();
  const adminName = env.ADMIN_NAME.trim();

  console.log(`Checking administrator account for: ${adminEmail}...`);

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  const salt = await bcrypt.genSalt(env.BCRYPT_SALT_ROUNDS);
  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, salt);

  if (existingAdmin) {
    console.log(`Administrator [${adminEmail}] already exists. Updating credentials and role...`);
    await prisma.user.update({
      where: { email: adminEmail },
      data: {
        name: adminName,
        passwordHash,
        role: 'ADMIN'
      }
    });
    console.log(`Administrator account [${adminEmail}] verified and updated successfully.`);
  } else {
    console.log(`Creating new administrator account for [${adminEmail}]...`);
    await prisma.user.create({
      data: {
        name: adminName,
        email: adminEmail,
        passwordHash,
        role: 'ADMIN'
      }
    });
    console.log(`Administrator account [${adminEmail}] created successfully with role ADMIN.`);
  }
};

// Execute if run directly via CLI
if (process.argv[1]?.endsWith('seed.js')) {
  seedAdmin()
    .catch((error) => {
      console.error('Admin seeding failed:', error.message);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export default seedAdmin;

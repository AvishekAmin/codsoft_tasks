import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { User } from '../src/models/User.js';

const seedAdmin = async () => {
  try {
    console.log('[Seed] Connecting to MongoDB...');
    await connectDB();

    const adminEmail = env.adminEmail.toLowerCase().trim();
    const adminName = env.adminName.trim();
    const adminPassword = env.adminPassword;

    console.log(`[Seed] Checking if administrator "${adminEmail}" already exists...`);
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      if (existingAdmin.role !== 'admin') {
        console.log(`[Seed] Account exists with email "${adminEmail}" but has role "${existingAdmin.role}". Promoting to admin...`);
        existingAdmin.role = 'admin';
        await existingAdmin.save();
        console.log('[Seed] User promoted to administrator successfully.');
      } else {
        console.log(`[Seed] Administrator account "${adminEmail}" already exists. No duplicate created.`);
      }
    } else {
      console.log(`[Seed] Creating initial administrator: ${adminName} <${adminEmail}>...`);
      const salt = await bcrypt.genSalt(env.bcryptSaltRounds);
      const passwordHash = await bcrypt.hash(adminPassword, salt);

      const admin = await User.create({
        name: adminName,
        email: adminEmail,
        passwordHash,
        role: 'admin'
      });

      console.log(`[Seed] Administrator created successfully with ID: ${admin._id}`);
    }

    console.log('[Seed] Seed script finished successfully.');
    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error(`[Seed] Error running administrator seed: ${error.message}`);
    await disconnectDB().catch(() => {});
    process.exit(1);
  }
};

seedAdmin();

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load .env from project root regardless of execution context
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Support both MONGODB_URI and MONGO_URI
const resolvedMongoUri =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  (process.env.NODE_ENV !== 'production' ? 'mongodb://127.0.0.1:27017/online-quiz-system' : undefined);

if (resolvedMongoUri) {
  process.env.MONGODB_URI = resolvedMongoUri;
}

// Fallback JWT_SECRET in development/test to prevent unexpected crashes
if (!process.env.JWT_SECRET && process.env.NODE_ENV !== 'production') {
  process.env.JWT_SECRET = 'codsoft_online_quiz_jwt_secret_dev_fallback_min_32_characters';
}

const requiredEnvVars = ['JWT_SECRET', 'MONGODB_URI'];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(
      `CRITICAL STARTUP ERROR: Missing required environment variable "${envVar}". Please configure your .env file with either MONGODB_URI or MONGO_URI, and JWT_SECRET.`
    );
  }
}

export const env = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10,
  corsOrigin: process.env.CORS_ORIGIN || '*',
  adminName: process.env.ADMIN_NAME || 'System Administrator',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@codsoft.quiz',
  adminPassword: process.env.ADMIN_PASSWORD || 'AdminSecurePassword123!'
};

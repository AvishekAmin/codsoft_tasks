import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('5002').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_URL_TEST: z.string().optional(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  BCRYPT_SALT_ROUNDS: z.string().default('10').transform((val) => parseInt(val, 10)),
  CORS_ORIGIN: z.string().default('http://localhost:3000')
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const formattedErrors = result.error.errors
      .map((err) => `  - ${err.path.join('.')}: ${err.message}`)
      .join('\n');
    console.error('CRITICAL: Environment validation failed:\n' + formattedErrors);
    throw new Error('Environment validation failed');
  }
  return result.data;
};

const env = parseEnv();
export default env;

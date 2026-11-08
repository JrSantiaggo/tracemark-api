import 'dotenv/config';
import { loadEnv, type Env } from '../../src/config/env.js';

export const INTERNAL_TOKEN = 'test-internal-token-with-at-least-32-characters';

export function testDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('TEST_DATABASE_URL must be defined (see .env.example)');
  return url;
}

export function buildTestEnv(): Env {
  return loadEnv({
    NODE_ENV: 'test',
    DATABASE_URL: testDatabaseUrl(),
    JWT_SECRET: 'test-jwt-secret-with-at-least-32-characters!!',
    INTERNAL_API_TOKEN: INTERNAL_TOKEN,
    AUTH_RATE_LIMIT_MAX: '1000',
    S3_BUCKET: 'tracemark-test',
    MAX_PHOTOS_PER_UPLOAD: '3',
    MAX_UPLOAD_SIZE_BYTES: String(5 * 1024 * 1024),
  });
}

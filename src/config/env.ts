import { z } from 'zod';
import { PHOTOS_PER_UPLOAD_CEILING } from '../modules/photos/domain/upload-limits.js';

const booleanString = z.enum(['true', 'false']).transform((value) => value === 'true');

const optionalUrl = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.url().optional(),
);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().min(1).default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3333),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  TRUST_PROXY: booleanString.default(false),
  CORS_ORIGINS: z
    .string()
    .default('')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),

  DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\//, 'must be a PostgreSQL connection string'),

  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN_SECONDS: z.coerce.number().int().positive().default(3600),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  INTERNAL_API_TOKEN: z.string().min(32),

  AWS_REGION: z.string().min(1).default('us-east-1'),
  S3_BUCKET: z.string().min(3),
  S3_ENDPOINT: optionalUrl,
  S3_FORCE_PATH_STYLE: booleanString.default(false),
  UPLOAD_URL_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
  DOWNLOAD_URL_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
  ORIGINAL_DOWNLOAD_URL_TTL_SECONDS: z.coerce.number().int().min(10).max(900).default(60),
  MAX_PHOTOS_PER_UPLOAD: z.coerce.number().int().min(1).max(PHOTOS_PER_UPLOAD_CEILING).default(10),
  MAX_UPLOAD_SIZE_BYTES: z.coerce.number().int().positive().default(15 * 1024 * 1024),
  STALE_UPLOAD_GRACE_MINUTES: z.coerce.number().int().min(0).default(60),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    throw new Error(`Invalid environment configuration:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

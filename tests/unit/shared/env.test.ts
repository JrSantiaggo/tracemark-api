import { describe, expect, it } from 'vitest';
import { loadEnv } from '../../../src/config/env.js';

const base = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  JWT_SECRET: 'x'.repeat(32),
  INTERNAL_API_TOKEN: 'y'.repeat(32),
  S3_BUCKET: 'bucket',
};

describe('loadEnv', () => {
  it('applies defaults and parses lists and booleans', () => {
    const env = loadEnv({ ...base, CORS_ORIGINS: 'http://a.com, http://b.com', S3_FORCE_PATH_STYLE: 'true', S3_ENDPOINT: '' });
    expect(env).toMatchObject({
      PORT: 3333,
      CORS_ORIGINS: ['http://a.com', 'http://b.com'],
      S3_FORCE_PATH_STYLE: true,
      S3_ENDPOINT: undefined,
    });
  });

  it('fails fast on missing or weak secrets without echoing values', () => {
    expect(() => loadEnv({ ...base, JWT_SECRET: 'short-secret' })).toThrow(/JWT_SECRET/);
    try {
      loadEnv({ ...base, JWT_SECRET: 'short-secret' });
    } catch (error) {
      expect((error as Error).message).not.toContain('short-secret');
    }
    expect(() => loadEnv({ ...base, DATABASE_URL: 'mysql://x' })).toThrow(/DATABASE_URL/);
    expect(() => loadEnv({ ...base, MAX_PHOTOS_PER_UPLOAD: '101' })).toThrow(/MAX_PHOTOS_PER_UPLOAD/);
  });
});

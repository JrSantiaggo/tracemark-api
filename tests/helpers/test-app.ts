import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { createPrismaClient, type PrismaClient } from '../../src/shared/infrastructure/database/prisma-client.js';
import { FakeStorageGateway } from './fake-storage-gateway.js';
import { buildTestEnv, INTERNAL_TOKEN } from './test-env.js';

export interface TestContext {
  app: FastifyInstance;
  prisma: PrismaClient;
  storage: FakeStorageGateway;
}

export async function createTestContext(): Promise<TestContext> {
  const env = buildTestEnv();
  const prisma = createPrismaClient(env.DATABASE_URL);
  const storage = new FakeStorageGateway();
  const app = await buildApp({ env, prisma, storage });
  await app.ready();
  return { app, prisma, storage };
}

export async function destroyTestContext({ app, prisma }: TestContext): Promise<void> {
  await app.close();
  await prisma.$disconnect();
}

export async function resetDatabase(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "purchases", "notifications", "comments", "photos", "users" RESTART IDENTITY CASCADE',
  );
}

let userSequence = 0;

export interface TestUser {
  id: string;
  token: string;
  email: string;
  name: string;
}

export async function registerUser(
  app: FastifyInstance,
  role: 'PHOTOGRAPHER' | 'USER',
  overrides: { name?: string; email?: string; password?: string } = {},
): Promise<TestUser> {
  userSequence += 1;
  const payload = {
    name: overrides.name ?? `${role.toLowerCase()} ${userSequence}`,
    email: overrides.email ?? `${role.toLowerCase()}${userSequence}-${Date.now()}@tracemark.test`,
    password: overrides.password ?? 'senha-segura-123',
    role,
  };
  const response = await app.inject({ method: 'POST', url: '/auth/register', payload });
  if (response.statusCode !== 201) throw new Error(`register failed: ${response.body}`);
  const body = response.json();
  return { id: body.user.id, token: body.accessToken, email: payload.email, name: payload.name };
}

export function auth(user: TestUser): Record<string, string> {
  return { authorization: `Bearer ${user.token}` };
}

export const internalHeaders = { 'x-internal-token': INTERNAL_TOKEN };

export function photoPayload(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Largada Maratona de Fortaleza',
    description: 'Pelotão de elite',
    eventName: 'Maratona de Fortaleza 2026',
    takenAt: '2026-10-12T06:30:00-03:00',
    price: '49.90',
    fileName: 'largada.jpg',
    mimeType: 'image/jpeg',
    fileSize: 1024,
    ...overrides,
  };
}

export async function createPhoto(
  ctx: TestContext,
  photographer: TestUser,
  target: 'UPLOADING' | 'PROCESSING' | 'PUBLISHABLE' = 'PUBLISHABLE',
  overrides: Record<string, unknown> = {},
): Promise<{ id: string; originalKey: string }> {
  const payload = photoPayload(overrides);
  const created = await ctx.app.inject({
    method: 'POST',
    url: '/photos',
    headers: auth(photographer),
    payload: { photos: [payload] },
  });
  if (created.statusCode !== 201) throw new Error(`create failed: ${created.body}`);
  const item = created.json().data[0];
  const id: string = item.photo.id;
  const originalKey: string = item.upload.fields.key;
  if (target === 'UPLOADING') return { id, originalKey };

  ctx.storage.simulateUpload(originalKey, payload.fileSize as number, payload.mimeType as string);
  const confirmed = await ctx.app.inject({
    method: 'POST',
    url: `/photos/${id}/confirm-upload`,
    headers: auth(photographer),
  });
  if (confirmed.statusCode !== 200) throw new Error(`confirm failed: ${confirmed.body}`);
  if (target === 'PROCESSING') return { id, originalKey };

  const published = await ctx.app.inject({
    method: 'PATCH',
    url: `/internal/photos/${id}/processing-result`,
    headers: internalHeaders,
    payload: { status: 'PUBLISHABLE', watermarkedKey: `photos/${id}/watermarked.jpg` },
  });
  if (published.statusCode !== 200) throw new Error(`publish failed: ${published.body}`);
  return { id, originalKey };
}

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  auth,
  createPhoto,
  createTestContext,
  destroyTestContext,
  registerUser,
  resetDatabase,
  type TestContext,
  type TestUser,
} from '../helpers/test-app.js';

describe('GET /feed', () => {
  let ctx: TestContext;
  let photographer: TestUser;
  let viewer: TestUser;

  beforeAll(async () => {
    ctx = await createTestContext();
  });
  afterAll(() => destroyTestContext(ctx));
  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    photographer = await registerUser(ctx.app, 'PHOTOGRAPHER', { name: 'Rafa Lentes' });
    viewer = await registerUser(ctx.app, 'USER');
  });

  it('lists only PUBLISHABLE photos, newest first', async () => {
    const older = await createPhoto(ctx, photographer, 'PUBLISHABLE', { title: 'Antiga' });
    const newer = await createPhoto(ctx, photographer, 'PUBLISHABLE', { title: 'Nova' });
    await createPhoto(ctx, photographer, 'UPLOADING');
    await createPhoto(ctx, photographer, 'PROCESSING');

    const response = await ctx.app.inject({ method: 'GET', url: '/feed', headers: auth(viewer) });

    expect(response.statusCode).toBe(200);
    const { data, nextCursor } = response.json();
    expect(data.map((p: { id: string }) => p.id)).toEqual([newer.id, older.id]);
    expect(nextCursor).toBeNull();
    expect(data[0]).toMatchObject({
      title: 'Nova',
      price: '49.90',
      status: 'PUBLISHABLE',
      photographer: { id: photographer.id, name: 'Rafa Lentes' },
      image: { variant: 'WATERMARKED' },
    });
    expect(data[0].publishedAt).toEqual(expect.any(String));
  });

  it('never shows ERROR photos', async () => {
    const { id } = await createPhoto(ctx, photographer, 'PROCESSING');
    await ctx.prisma.photo.update({ where: { id }, data: { status: 'ERROR' } });
    const response = await ctx.app.inject({ method: 'GET', url: '/feed', headers: auth(viewer) });
    expect(response.json().data).toEqual([]);
  });

  it('shows the original image to the owner and the watermarked one to others', async () => {
    await createPhoto(ctx, photographer);
    const asOwner = await ctx.app.inject({ method: 'GET', url: '/feed', headers: auth(photographer) });
    const asViewer = await ctx.app.inject({ method: 'GET', url: '/feed', headers: auth(viewer) });
    expect(asOwner.json().data[0].image.variant).toBe('ORIGINAL');
    expect(asViewer.json().data[0].image.variant).toBe('WATERMARKED');
  });

  it('paginates with a stable cursor', async () => {
    const ids: string[] = [];
    for (let i = 0; i < 5; i += 1) ids.unshift((await createPhoto(ctx, photographer)).id);

    const seen: string[] = [];
    let cursor: string | null = null;
    do {
      const url: string = `/feed?limit=2${cursor ? `&cursor=${cursor}` : ''}`;
      const body = (await ctx.app.inject({ method: 'GET', url, headers: auth(viewer) })).json();
      seen.push(...body.data.map((p: { id: string }) => p.id));
      cursor = body.nextCursor;
    } while (cursor);

    expect(seen).toEqual(ids);
  });

  it('validates pagination parameters', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/feed?limit=500', headers: auth(viewer) });
    expect(response.statusCode).toBe(400);
  });

  it('requires authentication', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/feed' });
    expect(response.statusCode).toBe(401);
  });
});

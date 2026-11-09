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

describe('Purchases', () => {
  let ctx: TestContext;
  let photographer: TestUser;
  let buyer: TestUser;
  let stranger: TestUser;
  let photoId: string;
  let originalKey: string;

  beforeAll(async () => {
    ctx = await createTestContext();
  });
  afterAll(() => destroyTestContext(ctx));
  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    ctx.storage.reset();
    photographer = await registerUser(ctx.app, 'PHOTOGRAPHER');
    buyer = await registerUser(ctx.app, 'USER', { name: 'Carla' });
    stranger = await registerUser(ctx.app, 'USER');
    ({ id: photoId, originalKey } = await createPhoto(ctx, photographer));
  });

  const purchase = (user: TestUser, id = photoId) =>
    ctx.app.inject({ method: 'POST', url: `/photos/${id}/purchase`, headers: auth(user) });
  const download = (user: TestUser, id = photoId) =>
    ctx.app.inject({ method: 'GET', url: `/photos/${id}/download`, headers: auth(user) });

  it('records the purchase with the current price and notifies the photographer', async () => {
    const response = await purchase(buyer);

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({ photoId, price: '49.90' });

    const notification = await ctx.prisma.notification.findFirstOrThrow({
      where: { userId: photographer.id, type: 'PHOTO_SOLD' },
    });
    expect(notification.message).toContain('Carla');
  });

  it('rejects buying the same photo twice without notifying again', async () => {
    await purchase(buyer);
    const again = await purchase(buyer);

    expect(again.statusCode).toBe(409);
    expect(again.json().error.code).toBe('PHOTO_ALREADY_PURCHASED');
    expect(await ctx.prisma.purchase.count()).toBe(1);
    expect(await ctx.prisma.notification.count({ where: { type: 'PHOTO_SOLD' } })).toBe(1);
  });

  it('does not let the photographer buy their own photo', async () => {
    const response = await purchase(photographer);
    expect(response.statusCode).toBe(422);
    expect(response.json().error.code).toBe('CANNOT_PURCHASE_OWN_PHOTO');
  });

  it('hides photos that are not published yet', async () => {
    const { id: processingId } = await createPhoto(ctx, photographer, 'PROCESSING');
    expect((await purchase(buyer, processingId)).statusCode).toBe(404);
    expect((await download(buyer, processingId)).statusCode).toBe(404);
  });

  it('requires a purchase to download the original', async () => {
    const response = await download(stranger);
    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('PURCHASE_REQUIRED');
  });

  it('gives buyers a short-lived attachment URL for the original', async () => {
    await purchase(buyer);
    const before = Date.now();
    const response = await download(buyer);

    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    const body = response.json();
    expect(body.url).toContain(originalKey);
    expect(body.url).toContain(`attachment=${encodeURIComponent('Largada Maratona de Fortaleza.jpg')}`);
    expect(body.fileName).toBe('Largada Maratona de Fortaleza.jpg');
    const ttlMs = new Date(body.expiresAt).getTime() - before;
    expect(ttlMs).toBeGreaterThan(55_000);
    expect(ttlMs).toBeLessThanOrEqual(61_000);
  });

  it('lets the photographer download their own original without buying', async () => {
    const response = await download(photographer);
    expect(response.statusCode).toBe(200);
    expect(response.json().url).toContain(originalKey);
  });

  it('exposes purchasedAt in the photo details only for the buyer', async () => {
    await purchase(buyer);

    const asBuyer = await ctx.app.inject({ method: 'GET', url: `/photos/${photoId}`, headers: auth(buyer) });
    const asStranger = await ctx.app.inject({ method: 'GET', url: `/photos/${photoId}`, headers: auth(stranger) });

    expect(asBuyer.json().purchasedAt).toEqual(expect.any(String));
    expect(asBuyer.json().image.variant).toBe('WATERMARKED');
    expect(asStranger.json().purchasedAt).toBeNull();
  });

  it('lists my purchases newest first with pagination', async () => {
    const { id: secondId } = await createPhoto(ctx, photographer, 'PUBLISHABLE', { title: 'Chegada', price: 30 });
    await purchase(buyer);
    await purchase(buyer, secondId);

    const first = await ctx.app.inject({ method: 'GET', url: '/purchases/me?limit=1', headers: auth(buyer) });
    expect(first.statusCode).toBe(200);
    const firstPage = first.json();
    expect(firstPage.data).toHaveLength(1);
    expect(firstPage.data[0]).toMatchObject({
      photoId: secondId,
      price: '30.00',
      photo: { id: secondId, title: 'Chegada', image: { variant: 'WATERMARKED' } },
    });

    const second = await ctx.app.inject({
      method: 'GET',
      url: `/purchases/me?limit=1&cursor=${firstPage.nextCursor}`,
      headers: auth(buyer),
    });
    expect(second.json().data.map((p: { photoId: string }) => p.photoId)).toEqual([photoId]);
    expect(second.json().nextCursor).toBeNull();

    const others = await ctx.app.inject({ method: 'GET', url: '/purchases/me', headers: auth(stranger) });
    expect(others.json().data).toEqual([]);
  });

  it('requires authentication', async () => {
    expect((await ctx.app.inject({ method: 'POST', url: `/photos/${photoId}/purchase` })).statusCode).toBe(401);
    expect((await ctx.app.inject({ method: 'GET', url: '/purchases/me' })).statusCode).toBe(401);
  });
});

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  auth,
  createPhoto,
  createTestContext,
  destroyTestContext,
  internalHeaders,
  photoPayload,
  registerUser,
  resetDatabase,
  type TestContext,
  type TestUser,
} from '../helpers/test-app.js';

describe('Photos', () => {
  let ctx: TestContext;
  let photographer: TestUser;
  let otherPhotographer: TestUser;
  let viewer: TestUser;

  beforeAll(async () => {
    ctx = await createTestContext();
  });
  afterAll(() => destroyTestContext(ctx));
  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    ctx.storage.reset();
    photographer = await registerUser(ctx.app, 'PHOTOGRAPHER', { name: 'Fotógrafa Dona' });
    otherPhotographer = await registerUser(ctx.app, 'PHOTOGRAPHER');
    viewer = await registerUser(ctx.app, 'USER');
  });

  describe('POST /photos', () => {
    it('creates photos in UPLOADING and returns presigned uploads bound to size and type', async () => {
      const response = await ctx.app.inject({
        method: 'POST',
        url: '/photos',
        headers: auth(photographer),
        payload: {
          photos: [
            photoPayload({ price: 49.9 }),
            photoPayload({ fileName: 'chegada.PNG', mimeType: 'image/png', fileSize: 2048, price: '10' }),
          ],
        },
      });

      expect(response.statusCode).toBe(201);
      const { data } = response.json();
      expect(data).toHaveLength(2);
      expect(data[0].photo).toMatchObject({ status: 'UPLOADING', price: '49.90', mimeType: 'image/jpeg' });
      expect(data[1].photo).toMatchObject({ price: '10.00', mimeType: 'image/png' });
      expect(data[0].upload).toMatchObject({ method: 'POST', fields: { key: `photos/${data[0].photo.id}/original.jpg` } });
      expect(data[1].upload.fields.key).toBe(`photos/${data[1].photo.id}/original.png`);

      expect(ctx.storage.presignedUploads).toEqual([
        expect.objectContaining({ contentType: 'image/jpeg', sizeBytes: 1024 }),
        expect.objectContaining({ contentType: 'image/png', sizeBytes: 2048 }),
      ]);

      const stored = await ctx.prisma.photo.findMany({ where: { photographerId: photographer.id } });
      expect(stored).toHaveLength(2);
      expect(stored.every((p) => p.status === 'UPLOADING')).toBe(true);
    });

    it('forbids common users from creating photos', async () => {
      const response = await ctx.app.inject({
        method: 'POST',
        url: '/photos',
        headers: auth(viewer),
        payload: { photos: [photoPayload()] },
      });
      expect(response.statusCode).toBe(403);
      expect(await ctx.prisma.photo.count()).toBe(0);
    });

    it.each([
      ['unsupported MIME type', { mimeType: 'image/gif', fileName: 'a.gif' }, 'VALIDATION_ERROR', 400],
      ['extension that does not match the MIME type', { fileName: 'a.png' }, 'FILE_EXTENSION_MISMATCH', 400],
      ['file without extension', { fileName: 'arquivo' }, 'FILE_EXTENSION_MISMATCH', 400],
      ['file larger than the limit', { fileSize: 6 * 1024 * 1024 }, 'FILE_TOO_LARGE', 400],
      ['negative price', { price: '-1' }, 'VALIDATION_ERROR', 400],
      ['price with 3 decimals', { price: '1.999' }, 'VALIDATION_ERROR', 400],
      ['empty title', { title: '   ' }, 'VALIDATION_ERROR', 400],
    ])('rejects %s', async (_label, overrides, code, status) => {
      const response = await ctx.app.inject({
        method: 'POST',
        url: '/photos',
        headers: auth(photographer),
        payload: { photos: [photoPayload(overrides)] },
      });
      expect(response.statusCode).toBe(status);
      expect(response.json().error.code).toBe(code);
      expect(await ctx.prisma.photo.count()).toBe(0);
    });

    it('does not persist any photo when one item of the batch is invalid', async () => {
      const response = await ctx.app.inject({
        method: 'POST',
        url: '/photos',
        headers: auth(photographer),
        payload: { photos: [photoPayload(), photoPayload({ fileName: 'x.png' })] },
      });
      expect(response.statusCode).toBe(400);
      expect(await ctx.prisma.photo.count()).toBe(0);
    });

    it('limits the batch size to MAX_PHOTOS_PER_UPLOAD', async () => {
      const send = (length: number) =>
        ctx.app.inject({
          method: 'POST',
          url: '/photos',
          headers: auth(photographer),
          payload: { photos: Array.from({ length }, () => photoPayload()) },
        });

      expect((await send(3)).statusCode).toBe(201);

      const tooMany = await send(4);
      expect(tooMany.statusCode).toBe(400);
      expect(tooMany.json().error.code).toBe('TOO_MANY_PHOTOS');
      expect(await ctx.prisma.photo.count()).toBe(3);
    });
  });

  describe('upload confirmation', () => {
    it('moves the photo to PROCESSING once the object exists in storage', async () => {
      const { id } = await createPhoto(ctx, photographer, 'PROCESSING');
      const stored = await ctx.prisma.photo.findUniqueOrThrow({ where: { id } });
      expect(stored.status).toBe('PROCESSING');
    });

    it('returns 422 when the object was not uploaded yet', async () => {
      const { id } = await createPhoto(ctx, photographer, 'UPLOADING');
      const response = await ctx.app.inject({
        method: 'POST',
        url: `/photos/${id}/confirm-upload`,
        headers: auth(photographer),
      });
      expect(response.statusCode).toBe(422);
      expect(response.json().error.code).toBe('UPLOAD_NOT_FOUND');
    });

    it('marks the photo as ERROR when the uploaded object differs from the declared metadata', async () => {
      const { id, originalKey } = await createPhoto(ctx, photographer, 'UPLOADING');
      ctx.storage.simulateUpload(originalKey, 999_999, 'image/jpeg');
      const response = await ctx.app.inject({
        method: 'POST',
        url: `/photos/${id}/confirm-upload`,
        headers: auth(photographer),
      });
      expect(response.statusCode).toBe(422);
      const stored = await ctx.prisma.photo.findUniqueOrThrow({ where: { id } });
      expect(stored).toMatchObject({ status: 'ERROR', processingError: 'INVALID_UPLOAD' });
    });

    it('is idempotent', async () => {
      const { id } = await createPhoto(ctx, photographer, 'PROCESSING');
      const again = await ctx.app.inject({
        method: 'POST',
        url: `/photos/${id}/confirm-upload`,
        headers: auth(photographer),
      });
      expect(again.statusCode).toBe(200);
      expect(again.json().status).toBe('PROCESSING');
    });

    it('hides photos of other photographers', async () => {
      const { id } = await createPhoto(ctx, photographer, 'UPLOADING');
      const response = await ctx.app.inject({
        method: 'POST',
        url: `/photos/${id}/confirm-upload`,
        headers: auth(otherPhotographer),
      });
      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /photos/:id/upload-url', () => {
    it('renews the upload URL while the photo is UPLOADING', async () => {
      const { id, originalKey } = await createPhoto(ctx, photographer, 'UPLOADING');
      const response = await ctx.app.inject({
        method: 'POST',
        url: `/photos/${id}/upload-url`,
        headers: auth(photographer),
      });
      expect(response.statusCode).toBe(200);
      expect(response.json().upload.fields.key).toBe(originalKey);
      expect(await ctx.prisma.photo.count()).toBe(1);
    });

    it('refuses to renew after the upload was confirmed', async () => {
      const { id } = await createPhoto(ctx, photographer, 'PROCESSING');
      const response = await ctx.app.inject({
        method: 'POST',
        url: `/photos/${id}/upload-url`,
        headers: auth(photographer),
      });
      expect(response.statusCode).toBe(409);
    });
  });

  describe('GET /photos/:id', () => {
    it('gives the owner the ORIGINAL image', async () => {
      const { id, originalKey } = await createPhoto(ctx, photographer);
      const response = await ctx.app.inject({ method: 'GET', url: `/photos/${id}`, headers: auth(photographer) });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.image.variant).toBe('ORIGINAL');
      expect(body.image.url).toContain(originalKey);
    });

    it.each(['USER', 'PHOTOGRAPHER'] as const)('gives a non-owner %s only the WATERMARKED image', async (role) => {
      const { id } = await createPhoto(ctx, photographer);
      const requester = role === 'USER' ? viewer : otherPhotographer;
      const response = await ctx.app.inject({ method: 'GET', url: `/photos/${id}`, headers: auth(requester) });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.image.variant).toBe('WATERMARKED');
      expect(body.image.url).toContain(`photos/${id}/watermarked.jpg`);
      expect(body.image.url).not.toContain('original');
    });

    it('returns photographer, price, status, details and comments', async () => {
      const { id } = await createPhoto(ctx, photographer);
      await ctx.app.inject({
        method: 'POST',
        url: `/photos/${id}/comments`,
        headers: auth(viewer),
        payload: { content: 'Que foto incrível!' },
      });

      const response = await ctx.app.inject({ method: 'GET', url: `/photos/${id}`, headers: auth(viewer) });
      expect(response.json()).toMatchObject({
        id,
        title: 'Largada Maratona de Fortaleza',
        eventName: 'Maratona de Fortaleza 2026',
        takenAt: '2026-10-12T09:30:00.000Z',
        price: '49.90',
        status: 'PUBLISHABLE',
        photographer: { id: photographer.id, name: 'Fotógrafa Dona' },
        comments: { data: [{ content: 'Que foto incrível!' }], nextCursor: null },
      });
      expect(response.json().publishedAt).toEqual(expect.any(String));
    });

    it.each(['UPLOADING', 'PROCESSING'] as const)(
      'hides %s photos from everyone but the owner',
      async (status) => {
        const { id } = await createPhoto(ctx, photographer, status);

        const asViewer = await ctx.app.inject({ method: 'GET', url: `/photos/${id}`, headers: auth(viewer) });
        expect(asViewer.statusCode).toBe(404);

        const asOwner = await ctx.app.inject({ method: 'GET', url: `/photos/${id}`, headers: auth(photographer) });
        expect(asOwner.statusCode).toBe(200);
        expect(asOwner.json().status).toBe(status);
      },
    );

    it('does not sign a URL for an original that was never uploaded', async () => {
      const { id } = await createPhoto(ctx, photographer, 'UPLOADING');
      const response = await ctx.app.inject({ method: 'GET', url: `/photos/${id}`, headers: auth(photographer) });
      expect(response.json().image).toBeNull();
    });

    it('requires authentication', async () => {
      const { id } = await createPhoto(ctx, photographer);
      const response = await ctx.app.inject({ method: 'GET', url: `/photos/${id}` });
      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /photos/me', () => {
    it('lists only the photographer photos in every state, paginated', async () => {
      await createPhoto(ctx, photographer, 'UPLOADING');
      await createPhoto(ctx, photographer, 'PROCESSING');
      await createPhoto(ctx, photographer, 'PUBLISHABLE');
      await createPhoto(ctx, otherPhotographer, 'PUBLISHABLE');

      const first = await ctx.app.inject({ method: 'GET', url: '/photos/me?limit=2', headers: auth(photographer) });
      expect(first.statusCode).toBe(200);
      const page1 = first.json();
      expect(page1.data).toHaveLength(2);
      expect(page1.nextCursor).toEqual(expect.any(String));

      const second = await ctx.app.inject({
        method: 'GET',
        url: `/photos/me?limit=2&cursor=${page1.nextCursor}`,
        headers: auth(photographer),
      });
      const page2 = second.json();
      expect(page2.data).toHaveLength(1);
      expect(page2.nextCursor).toBeNull();

      const statuses = [...page1.data, ...page2.data].map((p: { status: string }) => p.status).sort();
      expect(statuses).toEqual(['PROCESSING', 'PUBLISHABLE', 'UPLOADING']);
    });

    it('filters by status', async () => {
      await createPhoto(ctx, photographer, 'UPLOADING');
      await createPhoto(ctx, photographer, 'PUBLISHABLE');
      const response = await ctx.app.inject({
        method: 'GET',
        url: '/photos/me?status=PUBLISHABLE',
        headers: auth(photographer),
      });
      expect(response.json().data.map((p: { status: string }) => p.status)).toEqual(['PUBLISHABLE']);
    });

    it('is forbidden for common users', async () => {
      const response = await ctx.app.inject({ method: 'GET', url: '/photos/me', headers: auth(viewer) });
      expect(response.statusCode).toBe(403);
    });

    it('rejects invalid cursors', async () => {
      const response = await ctx.app.inject({
        method: 'GET',
        url: '/photos/me?cursor=bm90LWEtY3Vyc29y',
        headers: auth(photographer),
      });
      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe('INVALID_CURSOR');
    });
  });

  describe('PATCH /internal/photos/:id/processing-result', () => {
    it('rejects requests without the internal token', async () => {
      const { id } = await createPhoto(ctx, photographer, 'PROCESSING');
      const response = await ctx.app.inject({
        method: 'PATCH',
        url: `/internal/photos/${id}/processing-result`,
        headers: { 'x-internal-token': 'wrong' },
        payload: { status: 'PUBLISHABLE', watermarkedKey: `photos/${id}/watermarked.jpg` },
      });
      expect(response.statusCode).toBe(401);
    });

    it('does not accept user JWTs', async () => {
      const { id } = await createPhoto(ctx, photographer, 'PROCESSING');
      const response = await ctx.app.inject({
        method: 'PATCH',
        url: `/internal/photos/${id}/processing-result`,
        headers: auth(photographer),
        payload: { status: 'PUBLISHABLE', watermarkedKey: `photos/${id}/watermarked.jpg` },
      });
      expect(response.statusCode).toBe(401);
    });

    it('publishes the photo and notifies the photographer exactly once', async () => {
      const { id } = await createPhoto(ctx, photographer, 'PROCESSING');
      const payload = { status: 'PUBLISHABLE', watermarkedKey: `photos/${id}/watermarked.jpg` };
      const send = () =>
        ctx.app.inject({
          method: 'PATCH',
          url: `/internal/photos/${id}/processing-result`,
          headers: internalHeaders,
          payload,
        });

      const first = await send();
      expect(first.statusCode).toBe(200);
      expect(first.json()).toMatchObject({ status: 'PUBLISHABLE', watermarkedKey: payload.watermarkedKey });

      const redelivery = await send();
      expect(redelivery.statusCode).toBe(200);

      const notifications = await ctx.prisma.notification.findMany({ where: { userId: photographer.id } });
      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({ type: 'PHOTO_PUBLISHED', photoId: id });
    });

    it('accepts a result even if the client never confirmed the upload', async () => {
      const { id } = await createPhoto(ctx, photographer, 'UPLOADING');
      const response = await ctx.app.inject({
        method: 'PATCH',
        url: `/internal/photos/${id}/processing-result`,
        headers: internalHeaders,
        payload: { status: 'PUBLISHABLE', watermarkedKey: `photos/${id}/watermarked.jpg` },
      });
      expect(response.statusCode).toBe(200);
      expect(response.json().status).toBe('PUBLISHABLE');
    });

    it('records processing failures and notifies the photographer', async () => {
      const { id } = await createPhoto(ctx, photographer, 'PROCESSING');
      const response = await ctx.app.inject({
        method: 'PATCH',
        url: `/internal/photos/${id}/processing-result`,
        headers: internalHeaders,
        payload: { status: 'ERROR', reason: 'Imagem corrompida' },
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ status: 'ERROR', processingError: 'Imagem corrompida' });
      const notification = await ctx.prisma.notification.findFirstOrThrow({ where: { photoId: id } });
      expect(notification.type).toBe('PHOTO_PROCESSING_FAILED');
    });

    it('rejects watermarked keys that belong to another photo', async () => {
      const { id } = await createPhoto(ctx, photographer, 'PROCESSING');
      const response = await ctx.app.inject({
        method: 'PATCH',
        url: `/internal/photos/${id}/processing-result`,
        headers: internalHeaders,
        payload: { status: 'PUBLISHABLE', watermarkedKey: 'photos/other/watermarked.jpg' },
      });
      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe('INVALID_WATERMARKED_KEY');
    });

    it('rejects invalid transitions', async () => {
      const { id } = await createPhoto(ctx, photographer, 'PUBLISHABLE');
      const response = await ctx.app.inject({
        method: 'PATCH',
        url: `/internal/photos/${id}/processing-result`,
        headers: internalHeaders,
        payload: { status: 'ERROR', reason: 'late failure' },
      });
      expect(response.statusCode).toBe(409);
      expect(response.json().error.code).toBe('INVALID_STATUS_TRANSITION');
    });

    it('returns 404 for unknown photos', async () => {
      const response = await ctx.app.inject({
        method: 'PATCH',
        url: '/internal/photos/7c9e6679-7425-40de-944b-e07fc1f90ae7/processing-result',
        headers: internalHeaders,
        payload: { status: 'PROCESSING' },
      });
      expect(response.statusCode).toBe(404);
    });
  });
});

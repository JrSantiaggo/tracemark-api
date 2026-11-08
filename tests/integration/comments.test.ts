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

describe('Comments', () => {
  let ctx: TestContext;
  let photographer: TestUser;
  let alice: TestUser;
  let bob: TestUser;
  let photoId: string;

  beforeAll(async () => {
    ctx = await createTestContext();
  });
  afterAll(() => destroyTestContext(ctx));
  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    photographer = await registerUser(ctx.app, 'PHOTOGRAPHER');
    alice = await registerUser(ctx.app, 'USER', { name: 'Alice' });
    bob = await registerUser(ctx.app, 'USER', { name: 'Bob' });
    photoId = (await createPhoto(ctx, photographer)).id;
  });

  const comment = (user: TestUser, content: string, id = photoId) =>
    ctx.app.inject({
      method: 'POST',
      url: `/photos/${id}/comments`,
      headers: auth(user),
      payload: { content },
    });

  it('creates a comment with author info and notifies the photographer', async () => {
    const response = await comment(alice, '  Parabéns pela foto!  ');

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      photoId,
      content: 'Parabéns pela foto!',
      author: { id: alice.id, name: 'Alice' },
    });

    const notification = await ctx.prisma.notification.findFirstOrThrow({
      where: { userId: photographer.id, type: 'NEW_COMMENT' },
    });
    expect(notification.message).toContain('Alice');
  });

  it('does not notify the photographer about their own comments', async () => {
    await comment(photographer, 'Obrigado a todos!');
    expect(await ctx.prisma.notification.count({ where: { type: 'NEW_COMMENT' } })).toBe(0);
  });

  it('lists comments oldest first with pagination', async () => {
    await comment(alice, 'primeiro');
    await comment(bob, 'segundo');
    await comment(alice, 'terceiro');

    const first = (
      await ctx.app.inject({ method: 'GET', url: `/photos/${photoId}/comments?limit=2`, headers: auth(bob) })
    ).json();
    expect(first.data.map((c: { content: string }) => c.content)).toEqual(['primeiro', 'segundo']);

    const second = (
      await ctx.app.inject({
        method: 'GET',
        url: `/photos/${photoId}/comments?limit=2&cursor=${first.nextCursor}`,
        headers: auth(bob),
      })
    ).json();
    expect(second.data.map((c: { content: string }) => c.content)).toEqual(['terceiro']);
    expect(second.nextCursor).toBeNull();
  });

  it.each([
    ['empty', '   '],
    ['too long', 'a'.repeat(1001)],
  ])('rejects %s content', async (_label, content) => {
    const response = await comment(alice, content);
    expect(response.statusCode).toBe(400);
  });

  it('does not allow commenting or listing comments on non-publishable photos of others', async () => {
    const hidden = await createPhoto(ctx, photographer, 'PROCESSING');
    expect((await comment(alice, 'oi', hidden.id)).statusCode).toBe(404);
    const list = await ctx.app.inject({
      method: 'GET',
      url: `/photos/${hidden.id}/comments`,
      headers: auth(alice),
    });
    expect(list.statusCode).toBe(404);
  });

  describe('DELETE /comments/:id', () => {
    it('lets the author delete their comment', async () => {
      const { id } = (await comment(alice, 'apagar')).json();
      const response = await ctx.app.inject({ method: 'DELETE', url: `/comments/${id}`, headers: auth(alice) });
      expect(response.statusCode).toBe(204);
      expect(await ctx.prisma.comment.count()).toBe(0);
    });

    it('lets the photo owner moderate comments', async () => {
      const { id } = (await comment(alice, 'spam')).json();
      const response = await ctx.app.inject({
        method: 'DELETE',
        url: `/comments/${id}`,
        headers: auth(photographer),
      });
      expect(response.statusCode).toBe(204);
    });

    it('forbids other users', async () => {
      const { id } = (await comment(alice, 'meu comentário')).json();
      const response = await ctx.app.inject({ method: 'DELETE', url: `/comments/${id}`, headers: auth(bob) });
      expect(response.statusCode).toBe(403);
      expect(await ctx.prisma.comment.count()).toBe(1);
    });

    it('returns 404 for unknown comments', async () => {
      const response = await ctx.app.inject({
        method: 'DELETE',
        url: '/comments/7c9e6679-7425-40de-944b-e07fc1f90ae7',
        headers: auth(alice),
      });
      expect(response.statusCode).toBe(404);
    });
  });
});

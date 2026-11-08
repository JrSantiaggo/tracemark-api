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

describe('Notifications', () => {
  let ctx: TestContext;
  let photographer: TestUser;
  let viewer: TestUser;

  beforeAll(async () => {
    ctx = await createTestContext();
  });
  afterAll(() => destroyTestContext(ctx));
  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    photographer = await registerUser(ctx.app, 'PHOTOGRAPHER');
    viewer = await registerUser(ctx.app, 'USER');
  });

  const list = (user: TestUser, query = '') =>
    ctx.app.inject({ method: 'GET', url: `/notifications${query}`, headers: auth(user) });

  it('lists the user notifications newest first with the unread count', async () => {
    const { id: photoId } = await createPhoto(ctx, photographer);
    await ctx.app.inject({
      method: 'POST',
      url: `/photos/${photoId}/comments`,
      headers: auth(viewer),
      payload: { content: 'Top!' },
    });

    const response = await list(photographer);
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.unreadCount).toBe(2);
    expect(body.data.map((n: { type: string }) => n.type)).toEqual(['NEW_COMMENT', 'PHOTO_PUBLISHED']);
    expect(body.data[0]).toMatchObject({ photoId, readAt: null });

    expect((await list(viewer)).json()).toMatchObject({ data: [], unreadCount: 0 });
  });

  it('marks a notification as read and filters unread ones', async () => {
    await createPhoto(ctx, photographer);
    const [notification] = (await list(photographer)).json().data;

    const read = await ctx.app.inject({
      method: 'PATCH',
      url: `/notifications/${notification.id}/read`,
      headers: auth(photographer),
    });
    expect(read.statusCode).toBe(200);
    expect(read.json().readAt).toEqual(expect.any(String));

    const again = await ctx.app.inject({
      method: 'PATCH',
      url: `/notifications/${notification.id}/read`,
      headers: auth(photographer),
    });
    expect(again.json().readAt).toBe(read.json().readAt);

    expect((await list(photographer, '?unread=true')).json()).toMatchObject({ data: [], unreadCount: 0 });
  });

  it("does not allow reading someone else's notification", async () => {
    await createPhoto(ctx, photographer);
    const [notification] = (await list(photographer)).json().data;
    const response = await ctx.app.inject({
      method: 'PATCH',
      url: `/notifications/${notification.id}/read`,
      headers: auth(viewer),
    });
    expect(response.statusCode).toBe(404);
  });

  it('marks all notifications as read', async () => {
    await createPhoto(ctx, photographer);
    await createPhoto(ctx, photographer);
    const response = await ctx.app.inject({
      method: 'PATCH',
      url: '/notifications/read-all',
      headers: auth(photographer),
    });
    expect(response.json()).toEqual({ updated: 2 });
    expect((await list(photographer)).json().unreadCount).toBe(0);
  });

  it('requires authentication', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/notifications' });
    expect(response.statusCode).toBe(401);
  });
});

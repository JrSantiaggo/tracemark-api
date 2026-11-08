import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  auth,
  createTestContext,
  destroyTestContext,
  registerUser,
  resetDatabase,
  type TestContext,
} from '../helpers/test-app.js';

describe('Users', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestContext();
  });
  afterAll(() => destroyTestContext(ctx));
  beforeEach(() => resetDatabase(ctx.prisma));

  it('returns the public profile without private fields', async () => {
    const photographer = await registerUser(ctx.app, 'PHOTOGRAPHER', { name: 'Carla' });
    const viewer = await registerUser(ctx.app, 'USER');

    const response = await ctx.app.inject({
      method: 'GET',
      url: `/users/${photographer.id}`,
      headers: auth(viewer),
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toMatchObject({ id: photographer.id, name: 'Carla', role: 'PHOTOGRAPHER' });
    expect(body).not.toHaveProperty('email');
    expect(body).not.toHaveProperty('passwordHash');
  });

  it('returns 404 for unknown users and 400 for invalid ids', async () => {
    const viewer = await registerUser(ctx.app, 'USER');
    const unknown = await ctx.app.inject({
      method: 'GET',
      url: '/users/7c9e6679-7425-40de-944b-e07fc1f90ae7',
      headers: auth(viewer),
    });
    expect(unknown.statusCode).toBe(404);

    const invalid = await ctx.app.inject({ method: 'GET', url: '/users/abc', headers: auth(viewer) });
    expect(invalid.statusCode).toBe(400);
  });

  it('updates the authenticated profile and ignores role changes', async () => {
    const user = await registerUser(ctx.app, 'USER');
    const response = await ctx.app.inject({
      method: 'PATCH',
      url: '/users/me',
      headers: auth(user),
      payload: { name: 'Novo Nome', bio: 'Corredor amador', role: 'PHOTOGRAPHER' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ name: 'Novo Nome', bio: 'Corredor amador', role: 'USER' });
  });

  it('requires at least one field to update', async () => {
    const user = await registerUser(ctx.app, 'USER');
    const response = await ctx.app.inject({ method: 'PATCH', url: '/users/me', headers: auth(user), payload: {} });
    expect(response.statusCode).toBe(400);
  });

  it('requires authentication', async () => {
    const response = await ctx.app.inject({ method: 'PATCH', url: '/users/me', payload: { name: 'X Y' } });
    expect(response.statusCode).toBe(401);
  });
});

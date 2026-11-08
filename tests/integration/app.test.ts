import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestContext, destroyTestContext, type TestContext } from '../helpers/test-app.js';

describe('Application', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestContext();
  });
  afterAll(() => destroyTestContext(ctx));

  it('reports health including the database', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: 'ok', database: 'up' });
  });

  it('returns a standardized 404 for unknown routes', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/nao-existe' });
    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('ROUTE_NOT_FOUND');
  });

  it('serves the OpenAPI document with every module', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/docs/json' });
    expect(response.statusCode).toBe(200);
    const paths = Object.keys(response.json().paths);
    expect(paths).toEqual(
      expect.arrayContaining([
        '/auth/register',
        '/auth/login',
        '/auth/me',
        '/users/me',
        '/users/{id}',
        '/photos/',
        '/photos/me',
        '/photos/{id}',
        '/photos/{id}/upload-url',
        '/photos/{id}/confirm-upload',
        '/feed/',
        '/photos/{photoId}/comments',
        '/comments/{id}',
        '/notifications/',
        '/notifications/{id}/read',
        '/internal/photos/{id}/processing-result',
      ]),
    );
  });

  it('sets security headers', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/health' });
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });
});

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  auth,
  createTestContext,
  destroyTestContext,
  registerUser,
  resetDatabase,
  type TestContext,
} from '../helpers/test-app.js';

describe('Auth', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestContext();
  });
  afterAll(() => destroyTestContext(ctx));
  beforeEach(() => resetDatabase(ctx.prisma));

  describe('POST /auth/register', () => {
    it('creates a user, hashes the password and returns a token', async () => {
      const response = await ctx.app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { name: 'Ana Fotógrafa', email: 'Ana@Example.com', password: 'senha-segura-123', role: 'PHOTOGRAPHER' },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body).toMatchObject({
        tokenType: 'Bearer',
        expiresIn: 3600,
        user: { name: 'Ana Fotógrafa', email: 'ana@example.com', role: 'PHOTOGRAPHER', bio: null },
      });
      expect(body.accessToken).toEqual(expect.any(String));
      expect(body.user).not.toHaveProperty('passwordHash');

      const stored = await ctx.prisma.user.findUniqueOrThrow({ where: { email: 'ana@example.com' } });
      expect(stored.passwordHash).toMatch(/^\$argon2id\$/);
      expect(stored.passwordHash).not.toContain('senha-segura-123');
    });

    it('defaults the role to USER', async () => {
      const response = await ctx.app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { name: 'Bruno', email: 'bruno@example.com', password: 'senha-segura-123' },
      });
      expect(response.json().user.role).toBe('USER');
    });

    it('rejects duplicated e-mails with 409', async () => {
      await registerUser(ctx.app, 'USER', { email: 'dup@example.com' });
      const response = await ctx.app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { name: 'Outro', email: 'DUP@example.com', password: 'senha-segura-123' },
      });
      expect(response.statusCode).toBe(409);
      expect(response.json().error.code).toBe('EMAIL_ALREADY_IN_USE');
    });

    it('rejects invalid payloads with 400 and validation details', async () => {
      const response = await ctx.app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { name: 'A', email: 'not-an-email', password: '123', role: 'ADMIN' },
      });
      expect(response.statusCode).toBe(400);
      const { error } = response.json();
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details.map((d: { path: string }) => d.path)).toEqual(
        expect.arrayContaining(['/name', '/email', '/password', '/role']),
      );
    });

    it('returns 400 for malformed JSON without leaking internals', async () => {
      const response = await ctx.app.inject({
        method: 'POST',
        url: '/auth/register',
        headers: { 'content-type': 'application/json' },
        payload: '{"name":',
      });
      expect(response.statusCode).toBe(400);
      expect(response.body).not.toContain('at ');
    });
  });

  describe('POST /auth/login', () => {
    it('authenticates with valid credentials', async () => {
      const user = await registerUser(ctx.app, 'USER', { password: 'minha-senha-123' });
      const response = await ctx.app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: user.email.toUpperCase(), password: 'minha-senha-123' },
      });
      expect(response.statusCode).toBe(200);
      expect(response.json().user.id).toBe(user.id);
    });

    it.each([
      ['wrong password', 'existing'],
      ['unknown e-mail', 'unknown'],
    ])('returns the same 401 for %s', async (_label, kind) => {
      const user = await registerUser(ctx.app, 'USER', { password: 'minha-senha-123' });
      const response = await ctx.app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: kind === 'existing' ? user.email : 'ghost@example.com',
          password: 'senha-errada-123',
        },
      });
      expect(response.statusCode).toBe(401);
      expect(response.json().error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('GET /auth/me', () => {
    it('returns the authenticated user', async () => {
      const user = await registerUser(ctx.app, 'PHOTOGRAPHER');
      const response = await ctx.app.inject({ method: 'GET', url: '/auth/me', headers: auth(user) });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ id: user.id, email: user.email, role: 'PHOTOGRAPHER' });
    });

    it.each([
      ['missing header', undefined, 'MISSING_TOKEN'],
      ['malformed token', 'Bearer not-a-jwt', 'INVALID_TOKEN'],
      ['wrong scheme', 'Basic abc', 'MISSING_TOKEN'],
    ])('rejects %s with 401', async (_label, header, code) => {
      const response = await ctx.app.inject({
        method: 'GET',
        url: '/auth/me',
        headers: header ? { authorization: header } : {},
      });
      expect(response.statusCode).toBe(401);
      expect(response.json().error.code).toBe(code);
    });

    it('rejects tokens signed with another secret', async () => {
      const forged =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMzdlYzBmNC0xOTA3LTQwNGUtODJlYy01OWQ0YThjMzM1YzkiLCJyb2xlIjoiUEhPVE9HUkFQSEVSIiwiaXNzIjoidHJhY2VtYXJrLWFwaSJ9.invalid-signature';
      const response = await ctx.app.inject({
        method: 'GET',
        url: '/auth/me',
        headers: { authorization: `Bearer ${forged}` },
      });
      expect(response.statusCode).toBe(401);
    });
  });
});

import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { AuthGuards } from '../../../shared/presentation/auth-guards.js';
import type { AuthController } from './auth.controller.js';
import { loginSchema, meSchema, registerSchema } from './auth.schemas.js';

export function authRoutes(
  controller: AuthController,
  guards: AuthGuards,
  rateLimitMax: number,
): FastifyPluginAsyncZod {
  return async (app) => {
    const rateLimit = { max: rateLimitMax, timeWindow: '1 minute' };

    app.post('/register', { schema: registerSchema, config: { rateLimit } }, controller.register);
    app.post('/login', { schema: loginSchema, config: { rateLimit } }, controller.login);
    app.get('/me', { schema: meSchema, onRequest: guards.authenticate }, controller.me);
  };
}

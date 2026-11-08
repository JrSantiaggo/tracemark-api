import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { AuthGuards } from '../../../shared/presentation/auth-guards.js';
import type { UsersController } from './users.controller.js';
import { getPublicProfileSchema, updateMyProfileSchema } from './users.schemas.js';

export function usersRoutes(controller: UsersController, guards: AuthGuards): FastifyPluginAsyncZod {
  return async (app) => {
    app.addHook('onRequest', guards.authenticate);

    app.patch('/me', { schema: updateMyProfileSchema }, controller.updateMyProfile);
    app.get('/:id', { schema: getPublicProfileSchema }, controller.getPublicProfile);
  };
}

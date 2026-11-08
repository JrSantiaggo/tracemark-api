import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { AuthGuards } from '../../../shared/presentation/auth-guards.js';
import type { FeedController } from './feed.controller.js';
import { listFeedSchema } from './feed.schemas.js';

export function feedRoutes(controller: FeedController, guards: AuthGuards): FastifyPluginAsyncZod {
  return async (app) => {
    app.get('/', { schema: listFeedSchema, onRequest: guards.authenticate }, controller.list);
  };
}

import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { AuthGuards } from '../../../shared/presentation/auth-guards.js';
import type { NotificationsController } from './notifications.controller.js';
import {
  listNotificationsSchema,
  markAllNotificationsAsReadSchema,
  markNotificationAsReadSchema,
} from './notifications.schemas.js';

export function notificationsRoutes(
  controller: NotificationsController,
  guards: AuthGuards,
): FastifyPluginAsyncZod {
  return async (app) => {
    app.addHook('onRequest', guards.authenticate);

    app.get('/', { schema: listNotificationsSchema }, controller.list);
    app.patch('/read-all', { schema: markAllNotificationsAsReadSchema }, controller.markAllAsRead);
    app.patch('/:id/read', { schema: markNotificationAsReadSchema }, controller.markAsRead);
  };
}

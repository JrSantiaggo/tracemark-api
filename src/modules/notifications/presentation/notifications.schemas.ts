import { z } from 'zod';
import {
  bearerAuth,
  errorResponses,
  idParamSchema,
  pageResponseSchema,
  paginationQuerySchema,
} from '../../../shared/presentation/http-schemas.js';
import { notificationSchema } from './notification.presenter.js';

export const listNotificationsSchema = {
  tags: ['Notifications'],
  summary: 'Lista as notificações do usuário autenticado',
  security: bearerAuth,
  querystring: paginationQuerySchema.extend({
    unread: z.stringbool().default(false).describe('Quando true, retorna apenas as não lidas'),
  }),
  response: {
    200: pageResponseSchema(notificationSchema).extend({ unreadCount: z.number().int() }),
    ...errorResponses(400, 401),
  },
};

export const markNotificationAsReadSchema = {
  tags: ['Notifications'],
  summary: 'Marca uma notificação como lida',
  security: bearerAuth,
  params: idParamSchema,
  response: { 200: notificationSchema, ...errorResponses(400, 401, 404) },
};

export const markAllNotificationsAsReadSchema = {
  tags: ['Notifications'],
  summary: 'Marca todas as notificações como lidas',
  security: bearerAuth,
  response: { 200: z.object({ updated: z.number().int() }), ...errorResponses(401) },
};

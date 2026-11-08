import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { AuthGuards } from '../../../shared/presentation/auth-guards.js';
import type { CommentsController } from './comments.controller.js';
import { createCommentSchema, deleteCommentSchema, listCommentsSchema } from './comments.schemas.js';

export function commentsRoutes(controller: CommentsController, guards: AuthGuards): FastifyPluginAsyncZod {
  return async (app) => {
    app.addHook('onRequest', guards.authenticate);

    app.post('/photos/:photoId/comments', { schema: createCommentSchema }, controller.create);
    app.get('/photos/:photoId/comments', { schema: listCommentsSchema }, controller.list);
    app.delete('/comments/:id', { schema: deleteCommentSchema }, controller.delete);
  };
}

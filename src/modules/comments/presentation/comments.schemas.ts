import { z } from 'zod';
import {
  bearerAuth,
  errorResponses,
  idParamSchema,
  pageResponseSchema,
  paginationQuerySchema,
} from '../../../shared/presentation/http-schemas.js';
import { COMMENT_MAX_LENGTH } from '../domain/comment.js';
import { commentSchema } from './comment.presenter.js';

const photoIdParamSchema = z.object({ photoId: z.uuid() });

export const createCommentSchema = {
  tags: ['Comments'],
  summary: 'Comenta em uma fotografia',
  security: bearerAuth,
  params: photoIdParamSchema,
  body: z.object({ content: z.string().trim().min(1).max(COMMENT_MAX_LENGTH) }),
  response: { 201: commentSchema, ...errorResponses(400, 401, 404) },
};

export const listCommentsSchema = {
  tags: ['Comments'],
  summary: 'Lista os comentários de uma fotografia (mais antigos primeiro)',
  security: bearerAuth,
  params: photoIdParamSchema,
  querystring: paginationQuerySchema,
  response: { 200: pageResponseSchema(commentSchema), ...errorResponses(400, 401, 404) },
};

export const deleteCommentSchema = {
  tags: ['Comments'],
  summary: 'Exclui um comentário (autor ou dono da fotografia)',
  security: bearerAuth,
  params: idParamSchema,
  response: { 204: z.null().describe('Sem conteúdo'), ...errorResponses(400, 401, 403, 404) },
};

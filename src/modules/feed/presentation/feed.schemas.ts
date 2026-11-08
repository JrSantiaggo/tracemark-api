import {
  bearerAuth,
  errorResponses,
  pageResponseSchema,
  paginationQuerySchema,
} from '../../../shared/presentation/http-schemas.js';
import { photoSchema } from '../../photos/presentation/photo.presenter.js';

export const listFeedSchema = {
  tags: ['Feed'],
  summary: 'Mural de fotografias publicáveis, das mais recentes para as mais antigas',
  security: bearerAuth,
  querystring: paginationQuerySchema,
  response: { 200: pageResponseSchema(photoSchema), ...errorResponses(400, 401) },
};

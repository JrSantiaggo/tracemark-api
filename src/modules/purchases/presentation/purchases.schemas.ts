import {
  bearerAuth,
  errorResponses,
  idParamSchema,
  pageResponseSchema,
  paginationQuerySchema,
} from '../../../shared/presentation/http-schemas.js';
import { originalDownloadSchema, purchasedPhotoSchema, purchaseSchema } from './purchase.presenter.js';

export const purchasePhotoSchema = {
  tags: ['Purchases'],
  summary: 'Compra simulada de uma fotografia publicada (sem gateway de pagamento)',
  security: bearerAuth,
  params: idParamSchema,
  response: { 201: purchaseSchema, ...errorResponses(400, 401, 404, 409, 422) },
};

export const downloadOriginalSchema = {
  tags: ['Purchases'],
  summary: 'Gera uma URL de download da original, de curta duração (comprador ou dono)',
  description: 'A validade é definida por ORIGINAL_DOWNLOAD_URL_TTL_SECONDS (padrão 60s).',
  security: bearerAuth,
  params: idParamSchema,
  response: { 200: originalDownloadSchema, ...errorResponses(400, 401, 403, 404, 409) },
};

export const listMyPurchasesSchema = {
  tags: ['Purchases'],
  summary: 'Lista as fotografias compradas pelo usuário autenticado (mais recentes primeiro)',
  security: bearerAuth,
  querystring: paginationQuerySchema,
  response: { 200: pageResponseSchema(purchasedPhotoSchema), ...errorResponses(400, 401) },
};

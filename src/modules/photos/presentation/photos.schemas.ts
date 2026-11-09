import { z } from 'zod';
import { PhotoStatus } from '../domain/photo-status.js';
import { SUPPORTED_MIME_TYPES } from '../domain/image-format.js';
import { PHOTOS_PER_UPLOAD_CEILING } from '../domain/upload-limits.js';
import {
  bearerAuth,
  errorResponses,
  idParamSchema,
  isoDateTime,
  pageResponseSchema,
  paginationQuerySchema,
} from '../../../shared/presentation/http-schemas.js';
import { commentSchema } from '../../comments/presentation/comment.presenter.js';
import {
  photoBaseSchema,
  photoSchema,
  photoStatusSchema,
  photoWithUploadSchema,
} from './photo.presenter.js';

const PRICE_PATTERN = /^\d{1,8}(\.\d{1,2})?$/;

const priceSchema = z
  .union([z.string(), z.number()])
  .transform(String)
  .pipe(z.string().regex(PRICE_PATTERN, 'Preço deve ser positivo, com até 8 dígitos inteiros e 2 decimais.'))
  .transform((value) => {
    const [integer = '0', fraction = ''] = value.split('.');
    return `${BigInt(integer)}.${fraction.padEnd(2, '0')}`;
  })
  .describe('Preço em reais. Aceita string ("49.90") ou número (49.9).');

const createPhotoItemSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).nullish(),
  eventName: z.string().trim().max(160).nullish(),
  takenAt: z.iso
    .datetime({ offset: true })
    .transform((value) => new Date(value))
    .nullish(),
  price: priceSchema,
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.enum(SUPPORTED_MIME_TYPES),
  fileSize: z.number().int().positive().describe('Tamanho exato do arquivo em bytes'),
});

export const createPhotosSchema = {
  tags: ['Photos'],
  summary: 'Cria um lote de fotografias e devolve URLs pré-assinadas de upload',
  description: 'O tamanho máximo do lote é definido por MAX_PHOTOS_PER_UPLOAD (padrão 30).',
  security: bearerAuth,
  body: z.object({ photos: z.array(createPhotoItemSchema).min(1).max(PHOTOS_PER_UPLOAD_CEILING) }),
  response: { 201: z.object({ data: z.array(photoWithUploadSchema) }), ...errorResponses(400, 401, 403) },
};

export const renewUploadUrlSchema = {
  tags: ['Photos'],
  summary: 'Gera uma nova URL de upload para uma fotografia ainda em UPLOADING',
  security: bearerAuth,
  params: idParamSchema,
  response: { 200: photoWithUploadSchema, ...errorResponses(400, 401, 403, 404, 409) },
};

export const confirmUploadSchema = {
  tags: ['Photos'],
  summary: 'Confirma que o upload foi concluído (UPLOADING → PROCESSING)',
  security: bearerAuth,
  params: idParamSchema,
  response: { 200: photoSchema, ...errorResponses(400, 401, 403, 404, 409, 422) },
};

export const listMyPhotosSchema = {
  tags: ['Photos'],
  summary: 'Lista as fotografias do fotógrafo autenticado (todos os estados)',
  security: bearerAuth,
  querystring: paginationQuerySchema.extend({ status: photoStatusSchema.optional() }),
  response: { 200: pageResponseSchema(photoSchema), ...errorResponses(400, 401, 403) },
};

export const getPhotoDetailsSchema = {
  tags: ['Photos'],
  summary: 'Detalhes de uma fotografia, com a imagem adequada ao solicitante e comentários',
  security: bearerAuth,
  params: idParamSchema,
  response: {
    200: photoSchema.extend({
      purchasedAt: isoDateTime.nullable().describe('Data da compra pelo solicitante, ou null'),
      comments: pageResponseSchema(commentSchema),
    }),
    ...errorResponses(400, 401, 404),
  },
};

export const processingResultSchema = {
  tags: ['Internal'],
  summary: 'Atualiza o estado de processamento (uso exclusivo do Worker/Lambda)',
  security: [{ internalToken: [] }],
  params: idParamSchema,
  body: z.discriminatedUnion('status', [
    z.object({ status: z.literal(PhotoStatus.PROCESSING) }),
    z.object({
      status: z.literal(PhotoStatus.PUBLISHABLE),
      watermarkedKey: z.string().min(1).max(255).describe('photos/{photoId}/watermarked.{jpg|png|webp}'),
    }),
    z.object({ status: z.literal(PhotoStatus.ERROR), reason: z.string().trim().min(1).max(500) }),
  ]),
  response: {
    200: photoBaseSchema.extend({ watermarkedKey: z.string().nullable() }),
    ...errorResponses(400, 401, 404, 409),
  },
};

import { z } from 'zod';
import type { PresignedUpload } from '../../../shared/application/ports/storage-gateway.js';
import { isoDateTime, userSummarySchema } from '../../../shared/presentation/http-schemas.js';
import { ImageVariant, type PhotoView } from '../application/photo-image-url-resolver.js';
import type { Photo } from '../domain/photo.js';
import { PhotoStatus } from '../domain/photo-status.js';

export const photoStatusSchema = z.enum([
  PhotoStatus.UPLOADING,
  PhotoStatus.PROCESSING,
  PhotoStatus.PUBLISHABLE,
  PhotoStatus.ERROR,
]);

export const photoBaseSchema = z
  .object({
    id: z.uuid(),
    title: z.string(),
    description: z.string().nullable(),
    eventName: z.string().nullable(),
    takenAt: isoDateTime.nullable(),
    price: z.string().describe('Valor decimal com duas casas, ex.: "49.90"'),
    status: photoStatusSchema,
    mimeType: z.string(),
    fileSize: z.number().int(),
    processingError: z.string().nullable(),
    createdAt: isoDateTime,
    publishedAt: isoDateTime.nullable(),
  })
  .meta({ id: 'PhotoBase' });

export const imageSchema = z
  .object({
    variant: z.enum([ImageVariant.ORIGINAL, ImageVariant.WATERMARKED]),
    url: z.string().describe('URL temporária e assinada'),
    expiresAt: isoDateTime,
  })
  .meta({ id: 'PhotoImage' });

export const photoSchema = photoBaseSchema
  .extend({ photographer: userSummarySchema, image: imageSchema.nullable() })
  .meta({ id: 'Photo' });

export const uploadSchema = z
  .object({
    method: z.literal('POST'),
    url: z.string(),
    fields: z.record(z.string(), z.string()).describe('Campos que devem acompanhar o multipart/form-data'),
    expiresAt: isoDateTime,
  })
  .meta({ id: 'PresignedUpload' });

export const photoWithUploadSchema = z.object({ photo: photoBaseSchema, upload: uploadSchema });

export function presentPhotoBase(photo: Photo): z.infer<typeof photoBaseSchema> {
  const p = photo.toSnapshot();
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    eventName: p.eventName,
    takenAt: p.takenAt?.toISOString() ?? null,
    price: p.price,
    status: p.status,
    mimeType: p.mimeType,
    fileSize: p.fileSize,
    processingError: p.processingError,
    createdAt: p.createdAt.toISOString(),
    publishedAt: p.publishedAt?.toISOString() ?? null,
  };
}

export function presentPhoto(view: PhotoView): z.infer<typeof photoSchema> {
  return {
    ...presentPhotoBase(view.photo),
    photographer: view.photographer,
    image: view.image && { ...view.image, expiresAt: view.image.expiresAt.toISOString() },
  };
}

export function presentPhotoWithUpload(photo: Photo, upload: PresignedUpload) {
  return {
    photo: presentPhotoBase(photo),
    upload: {
      method: 'POST' as const,
      url: upload.url,
      fields: upload.fields,
      expiresAt: upload.expiresAt.toISOString(),
    },
  };
}

import { z } from 'zod';
import { isoDateTime } from '../../../shared/presentation/http-schemas.js';
import { photoSchema, presentPhoto } from '../../photos/presentation/photo.presenter.js';
import type { OriginalDownload } from '../application/use-cases/get-original-download.use-case.js';
import type { PurchaseView } from '../application/use-cases/list-my-purchases.use-case.js';
import type { Purchase } from '../domain/purchase.js';

export const purchaseSchema = z
  .object({
    id: z.uuid(),
    photoId: z.uuid(),
    price: z.string().describe('Valor pago, congelado no momento da compra'),
    purchasedAt: isoDateTime,
  })
  .meta({ id: 'Purchase' });

export const purchasedPhotoSchema = purchaseSchema.extend({ photo: photoSchema }).meta({ id: 'PurchasedPhoto' });

export const originalDownloadSchema = z
  .object({
    url: z.string().describe('URL assinada da original, de curta duração, para download'),
    expiresAt: isoDateTime,
    fileName: z.string(),
  })
  .meta({ id: 'OriginalDownload' });

export function presentPurchase(purchase: Purchase): z.infer<typeof purchaseSchema> {
  return {
    id: purchase.id,
    photoId: purchase.photoId,
    price: purchase.price,
    purchasedAt: purchase.createdAt.toISOString(),
  };
}

export function presentPurchasedPhoto(view: PurchaseView): z.infer<typeof purchasedPhotoSchema> {
  return { ...presentPurchase(view.purchase), photo: presentPhoto(view.photo) };
}

export function presentOriginalDownload(download: OriginalDownload): z.infer<typeof originalDownloadSchema> {
  return { url: download.url, expiresAt: download.expiresAt.toISOString(), fileName: download.fileName };
}

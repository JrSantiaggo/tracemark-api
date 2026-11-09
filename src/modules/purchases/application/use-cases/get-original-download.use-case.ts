import type { StorageGateway } from '../../../../shared/application/ports/storage-gateway.js';
import type { Actor } from '../../../../shared/domain/actor.js';
import type { PhotoRepository } from '../../../photos/application/photo.repository.js';
import { PhotoNotFoundError } from '../../../photos/domain/photo.errors.js';
import { OriginalNotAvailableError, PurchaseRequiredError } from '../../domain/purchase.errors.js';
import type { PurchaseRepository } from '../purchase.repository.js';

export interface OriginalDownload {
  url: string;
  expiresAt: Date;
  fileName: string;
}

export class GetOriginalDownloadUseCase {
  constructor(
    private readonly photos: PhotoRepository,
    private readonly purchases: PurchaseRepository,
    private readonly storage: StorageGateway,
    private readonly urlTtlSeconds: number,
  ) {}

  async execute(actor: Actor, photoId: string): Promise<OriginalDownload> {
    const photo = await this.photos.findById(photoId);
    if (!photo || !photo.isVisibleTo(actor.id)) throw new PhotoNotFoundError();

    if (!photo.isOwnedBy(actor.id)) {
      const purchase = await this.purchases.findByPhotoAndBuyer(photoId, actor.id);
      if (!purchase) throw new PurchaseRequiredError();
    }
    if (!photo.hasOriginalInStorage()) throw new OriginalNotAvailableError();

    const fileName = photo.originalFileName();
    const { url, expiresAt } = await this.storage.createDownloadUrl(photo.originalKey, this.urlTtlSeconds, {
      attachmentFileName: fileName,
    });
    return { url, expiresAt, fileName };
  }
}

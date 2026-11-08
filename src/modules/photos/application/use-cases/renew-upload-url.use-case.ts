import type {
  PresignedUpload,
  StorageGateway,
} from '../../../../shared/application/ports/storage-gateway.js';
import type { Actor } from '../../../../shared/domain/actor.js';
import type { Photo } from '../../domain/photo.js';
import { PhotoNotFoundError, PhotoStateChangedError } from '../../domain/photo.errors.js';
import { PhotoStatus } from '../../domain/photo-status.js';
import type { PhotoRepository } from '../photo.repository.js';

export class RenewUploadUrlUseCase {
  constructor(
    private readonly photos: PhotoRepository,
    private readonly storage: StorageGateway,
    private readonly uploadUrlTtlSeconds: number,
  ) {}

  async execute(actor: Actor, photoId: string): Promise<{ photo: Photo; upload: PresignedUpload }> {
    const photo = await this.photos.findById(photoId);
    if (!photo || !photo.isOwnedBy(actor.id)) throw new PhotoNotFoundError();

    const upload = await this.storage.createPresignedUpload({
      key: photo.originalKey,
      contentType: photo.mimeType,
      sizeBytes: photo.fileSize,
      expiresInSeconds: this.uploadUrlTtlSeconds,
    });
    photo.renewUploadWindow(upload.expiresAt);

    if (!(await this.photos.save(photo, PhotoStatus.UPLOADING))) throw new PhotoStateChangedError();
    return { photo, upload };
  }
}

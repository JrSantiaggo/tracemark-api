import type { StorageGateway } from '../../../../shared/application/ports/storage-gateway.js';
import type { Actor } from '../../../../shared/domain/actor.js';
import {
  InvalidPhotoStatusTransitionError,
  PhotoNotFoundError,
  PhotoStateChangedError,
  UploadMismatchError,
  UploadNotFoundError,
} from '../../domain/photo.errors.js';
import { PhotoFailureReason, PhotoStatus } from '../../domain/photo-status.js';
import type { PhotoImageUrlResolver, PhotoView } from '../photo-image-url-resolver.js';
import type { PhotoRepository } from '../photo.repository.js';

export class ConfirmUploadUseCase {
  constructor(
    private readonly photos: PhotoRepository,
    private readonly storage: StorageGateway,
    private readonly images: PhotoImageUrlResolver,
  ) {}

  async execute(actor: Actor, photoId: string): Promise<PhotoView> {
    const entry = await this.photos.findByIdWithPhotographer(photoId);
    if (!entry || !entry.photo.isOwnedBy(actor.id)) throw new PhotoNotFoundError();
    const { photo } = entry;

    if (photo.status === PhotoStatus.PROCESSING || photo.status === PhotoStatus.PUBLISHABLE) {
      return this.images.toView(entry, actor.id);
    }
    if (photo.status !== PhotoStatus.UPLOADING) {
      throw new InvalidPhotoStatusTransitionError(photo.status, PhotoStatus.PROCESSING);
    }

    const stored = await this.storage.getObjectMetadata(photo.originalKey);
    if (!stored) throw new UploadNotFoundError();

    const matches =
      stored.sizeBytes === photo.fileSize &&
      (stored.contentType === null || stored.contentType.toLowerCase() === photo.mimeType);

    if (!matches) {
      photo.fail(PhotoFailureReason.INVALID_UPLOAD);
      await this.photos.save(photo, PhotoStatus.UPLOADING);
      throw new UploadMismatchError();
    }

    photo.markUploadReceived();
    if (!(await this.photos.save(photo, PhotoStatus.UPLOADING))) throw new PhotoStateChangedError();
    return this.images.toView(entry, actor.id);
  }
}

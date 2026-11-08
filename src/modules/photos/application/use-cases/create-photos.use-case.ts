import { randomUUID } from 'node:crypto';
import type {
  PresignedUpload,
  StorageGateway,
} from '../../../../shared/application/ports/storage-gateway.js';
import type { Actor } from '../../../../shared/domain/actor.js';
import { ForbiddenError } from '../../../../shared/domain/errors.js';
import { UserRole } from '../../../../shared/domain/user-role.js';
import { resolveImageExtension } from '../../domain/image-format.js';
import { Photo } from '../../domain/photo.js';
import { FileTooLargeError, TooManyPhotosError } from '../../domain/photo.errors.js';
import { PhotoStorageKeys } from '../../domain/photo-storage-keys.js';
import type { PhotoRepository } from '../photo.repository.js';

export interface CreatePhotoInput {
  title: string;
  description?: string | null | undefined;
  eventName?: string | null | undefined;
  takenAt?: Date | null | undefined;
  price: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

export interface CreatedPhoto {
  photo: Photo;
  upload: PresignedUpload;
}

export interface CreatePhotosConfig {
  maxPhotosPerUpload: number;
  maxUploadSizeBytes: number;
  uploadUrlTtlSeconds: number;
}

export class CreatePhotosUseCase {
  constructor(
    private readonly photos: PhotoRepository,
    private readonly storage: StorageGateway,
    private readonly config: CreatePhotosConfig,
  ) {}

  async execute(actor: Actor, inputs: CreatePhotoInput[]): Promise<CreatedPhoto[]> {
    if (actor.role !== UserRole.PHOTOGRAPHER) {
      throw new ForbiddenError('PHOTOGRAPHER_ONLY', 'Apenas fotógrafos podem publicar fotografias.');
    }

    if (inputs.length > this.config.maxPhotosPerUpload) {
      throw new TooManyPhotosError(this.config.maxPhotosPerUpload);
    }

    const now = new Date();
    const uploadExpiresAt = new Date(now.getTime() + this.config.uploadUrlTtlSeconds * 1000);

    const photos = inputs.map((input) => {
      if (input.fileSize > this.config.maxUploadSizeBytes) {
        throw new FileTooLargeError(this.config.maxUploadSizeBytes);
      }
      const extension = resolveImageExtension(input.mimeType, input.fileName);
      const id = randomUUID();

      return Photo.createPending({
        id,
        photographerId: actor.id,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        eventName: input.eventName?.trim() || null,
        takenAt: input.takenAt ?? null,
        price: input.price,
        originalKey: PhotoStorageKeys.original(id, extension),
        mimeType: input.mimeType.toLowerCase(),
        fileSize: input.fileSize,
        uploadExpiresAt,
        now,
      });
    });

    const uploads = await Promise.all(photos.map((photo) => this.presign(photo)));
    await this.photos.createMany(photos);

    return photos.map((photo, index) => ({ photo, upload: uploads[index]! }));
  }

  private presign(photo: Photo): Promise<PresignedUpload> {
    return this.storage.createPresignedUpload({
      key: photo.originalKey,
      contentType: photo.mimeType,
      sizeBytes: photo.fileSize,
      expiresInSeconds: this.config.uploadUrlTtlSeconds,
    });
  }
}

import type { Page, PageRequest, UserSummary } from '../../../shared/domain/pagination.js';
import type { Photo } from '../domain/photo.js';
import type { PhotoStatus } from '../domain/photo-status.js';

export interface PhotoWithPhotographer {
  photo: Photo;
  photographer: UserSummary;
}

export interface PhotoRepository {
  createMany(photos: Photo[]): Promise<void>;
  findById(id: string): Promise<Photo | null>;
  findByIdWithPhotographer(id: string): Promise<PhotoWithPhotographer | null>;
  /** Persists the photo only if its stored status still equals `expectedStatus`. Returns false otherwise. */
  save(photo: Photo, expectedStatus: PhotoStatus): Promise<boolean>;
  listByPhotographer(
    photographerId: string,
    filter: { status?: PhotoStatus | undefined },
    page: PageRequest,
  ): Promise<Page<PhotoWithPhotographer>>;
  listPublishable(page: PageRequest): Promise<Page<PhotoWithPhotographer>>;
  expireStaleUploads(expiredBefore: Date, reason: string): Promise<number>;
}

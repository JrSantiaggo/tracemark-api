import type { Page, PageRequest } from '../../src/shared/domain/pagination.js';
import type { PhotoRepository, PhotoWithPhotographer } from '../../src/modules/photos/application/photo.repository.js';
import { Photo } from '../../src/modules/photos/domain/photo.js';
import { PhotoStatus } from '../../src/modules/photos/domain/photo-status.js';

export class InMemoryPhotoRepository implements PhotoRepository {
  readonly rows = new Map<string, Photo>();

  async createMany(photos: Photo[]): Promise<void> {
    for (const photo of photos) this.rows.set(photo.id, Photo.restore(photo.toSnapshot()));
  }

  async findById(id: string): Promise<Photo | null> {
    const row = this.rows.get(id);
    return row ? Photo.restore(row.toSnapshot()) : null;
  }

  async findByIdWithPhotographer(id: string): Promise<PhotoWithPhotographer | null> {
    const photo = await this.findById(id);
    return photo && { photo, photographer: { id: photo.photographerId, name: 'Fotógrafo' } };
  }

  async save(photo: Photo, expectedStatus: PhotoStatus): Promise<boolean> {
    if (this.rows.get(photo.id)?.status !== expectedStatus) return false;
    this.rows.set(photo.id, Photo.restore(photo.toSnapshot()));
    return true;
  }

  async listByPhotographer(): Promise<Page<PhotoWithPhotographer>> {
    throw new Error('not needed in unit tests');
  }

  async listPublishable(_page: PageRequest): Promise<Page<PhotoWithPhotographer>> {
    throw new Error('not needed in unit tests');
  }

  async expireStaleUploads(expiredBefore: Date, reason: string): Promise<number> {
    let count = 0;
    for (const photo of this.rows.values()) {
      const snapshot = photo.toSnapshot();
      if (snapshot.status === PhotoStatus.UPLOADING && snapshot.uploadExpiresAt < expiredBefore) {
        photo.fail(reason);
        count += 1;
      }
    }
    return count;
  }
}

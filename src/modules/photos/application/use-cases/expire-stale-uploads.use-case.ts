import { PhotoFailureReason } from '../../domain/photo-status.js';
import type { PhotoRepository } from '../photo.repository.js';

export class ExpireStaleUploadsUseCase {
  constructor(
    private readonly photos: PhotoRepository,
    private readonly graceMinutes: number,
  ) {}

  async execute(now: Date = new Date()): Promise<{ expired: number }> {
    const threshold = new Date(now.getTime() - this.graceMinutes * 60_000);
    const expired = await this.photos.expireStaleUploads(threshold, PhotoFailureReason.UPLOAD_EXPIRED);
    return { expired };
  }
}

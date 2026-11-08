import type { StorageGateway } from '../../../shared/application/ports/storage-gateway.js';
import type { Photo } from '../domain/photo.js';
import type { PhotoWithPhotographer } from './photo.repository.js';

export const ImageVariant = {
  ORIGINAL: 'ORIGINAL',
  WATERMARKED: 'WATERMARKED',
} as const;

export type ImageVariant = (typeof ImageVariant)[keyof typeof ImageVariant];

export interface ResolvedImage {
  variant: ImageVariant;
  url: string;
  expiresAt: Date;
}

export interface PhotoView extends PhotoWithPhotographer {
  image: ResolvedImage | null;
}

export class PhotoImageUrlResolver {
  constructor(
    private readonly storage: StorageGateway,
    private readonly downloadUrlTtlSeconds: number,
  ) {}

  async resolve(photo: Photo, viewerId: string): Promise<ResolvedImage | null> {
    if (photo.isOwnedBy(viewerId)) {
      if (!photo.hasOriginalInStorage()) return null;
      return this.sign(photo.originalKey, ImageVariant.ORIGINAL);
    }

    if (photo.isPublishable() && photo.watermarkedKey) {
      return this.sign(photo.watermarkedKey, ImageVariant.WATERMARKED);
    }

    return null;
  }

  async toView(entry: PhotoWithPhotographer, viewerId: string): Promise<PhotoView> {
    return { ...entry, image: await this.resolve(entry.photo, viewerId) };
  }

  private async sign(key: string, variant: ImageVariant): Promise<ResolvedImage> {
    const { url, expiresAt } = await this.storage.createDownloadUrl(key, this.downloadUrlTtlSeconds);
    return { variant, url, expiresAt };
  }
}

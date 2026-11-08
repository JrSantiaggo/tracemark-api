export const PhotoStorageKeys = {
  original(photoId: string, extension: string): string {
    return `photos/${photoId}/original.${extension}`;
  },

  isValidWatermarkedKey(photoId: string, key: string): boolean {
    return new RegExp(`^photos/${photoId}/watermarked\\.(jpg|png|webp)$`).test(key);
  },
};

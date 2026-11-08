import { Photo, type PhotoProps } from '../../src/modules/photos/domain/photo.js';
import { PhotoStatus } from '../../src/modules/photos/domain/photo-status.js';

export const PHOTO_ID = '0b9a3c6e-6f0e-4a4b-9a8e-2f3d1c4b5a69';
export const OWNER_ID = '5d1c0a7e-3b2f-4c8d-9e1a-7f6b5c4d3e2f';
export const STRANGER_ID = '9f8e7d6c-5b4a-4392-8170-6f5e4d3c2b1a';

export function buildPhoto(overrides: Partial<PhotoProps> = {}): Photo {
  const now = new Date('2026-11-08T12:00:00Z');
  return Photo.restore({
    id: PHOTO_ID,
    photographerId: OWNER_ID,
    title: 'Chegada',
    description: null,
    eventName: null,
    takenAt: null,
    price: '25.00',
    originalKey: `photos/${PHOTO_ID}/original.jpg`,
    watermarkedKey: null,
    status: PhotoStatus.UPLOADING,
    mimeType: 'image/jpeg',
    fileSize: 1000,
    processingError: null,
    uploadExpiresAt: new Date(now.getTime() + 15 * 60_000),
    createdAt: now,
    updatedAt: now,
    publishedAt: null,
    ...overrides,
  });
}

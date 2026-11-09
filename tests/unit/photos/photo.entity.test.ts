import { describe, expect, it } from 'vitest';
import { InvalidPhotoStatusTransitionError, InvalidWatermarkedKeyError } from '../../../src/modules/photos/domain/photo.errors.js';
import { PhotoFailureReason, PhotoStatus } from '../../../src/modules/photos/domain/photo-status.js';
import { buildPhoto, OWNER_ID, PHOTO_ID, STRANGER_ID } from '../../helpers/photo-factory.js';

describe('Photo entity', () => {
  it('follows the happy path UPLOADING → PROCESSING → PUBLISHABLE', () => {
    const photo = buildPhoto();
    photo.markUploadReceived();
    expect(photo.status).toBe(PhotoStatus.PROCESSING);

    const now = new Date();
    photo.publish(`photos/${PHOTO_ID}/watermarked.jpg`, now);
    expect(photo.toSnapshot()).toMatchObject({
      status: PhotoStatus.PUBLISHABLE,
      watermarkedKey: `photos/${PHOTO_ID}/watermarked.jpg`,
      publishedAt: now,
    });
  });

  it.each([
    [PhotoStatus.UPLOADING, 'publish'],
    [PhotoStatus.PUBLISHABLE, 'markUploadReceived'],
    [PhotoStatus.PUBLISHABLE, 'fail'],
    [PhotoStatus.ERROR, 'markUploadReceived'],
    [PhotoStatus.ERROR, 'publish'],
  ] as const)('rejects %s → %s', (status, action) => {
    const photo = buildPhoto({ status });
    const run = () => {
      if (action === 'publish') photo.publish(`photos/${PHOTO_ID}/watermarked.jpg`, new Date());
      else if (action === 'fail') photo.fail('x');
      else photo.markUploadReceived();
    };
    expect(run).toThrow(InvalidPhotoStatusTransitionError);
  });

  it('rejects watermarked keys outside the photo prefix', () => {
    const photo = buildPhoto({ status: PhotoStatus.PROCESSING });
    expect(() => photo.publish('photos/another/watermarked.jpg', new Date())).toThrow(InvalidWatermarkedKeyError);
    expect(() => photo.publish(`photos/${PHOTO_ID}/original.jpg`, new Date())).toThrow(InvalidWatermarkedKeyError);
  });

  it('is visible to the owner always and to others only when publishable', () => {
    const processing = buildPhoto({ status: PhotoStatus.PROCESSING });
    expect(processing.isVisibleTo(OWNER_ID)).toBe(true);
    expect(processing.isVisibleTo(STRANGER_ID)).toBe(false);
    expect(buildPhoto({ status: PhotoStatus.PUBLISHABLE }).isVisibleTo(STRANGER_ID)).toBe(true);
  });

  it('knows when the original exists in storage', () => {
    expect(buildPhoto().hasOriginalInStorage()).toBe(false);
    expect(buildPhoto({ status: PhotoStatus.PROCESSING }).hasOriginalInStorage()).toBe(true);
    expect(
      buildPhoto({ status: PhotoStatus.ERROR, processingError: PhotoFailureReason.UPLOAD_EXPIRED }).hasOriginalInStorage(),
    ).toBe(false);
  });

  it('only renews the upload window while UPLOADING', () => {
    const later = new Date('2030-01-01T00:00:00Z');
    const uploading = buildPhoto();
    uploading.renewUploadWindow(later);
    expect(uploading.toSnapshot().uploadExpiresAt).toEqual(later);
    expect(() => buildPhoto({ status: PhotoStatus.PROCESSING }).renewUploadWindow(later)).toThrow(
      InvalidPhotoStatusTransitionError,
    );
  });

  it.each([
    ['Chegada', 'original.jpg', 'Chegada.jpg'],
    ['Largada: km 0 / "elite"', 'original.png', 'Largada km 0 elite.png'],
    ['  ', 'original.webp', 'tracemark.webp'],
  ])('builds a safe download file name from %j', (title, file, expected) => {
    const photo = buildPhoto({ title, originalKey: `photos/${PHOTO_ID}/${file}` });
    expect(photo.originalFileName()).toBe(expected);
  });
});

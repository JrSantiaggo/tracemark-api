import { beforeEach, describe, expect, it } from 'vitest';
import { PhotoImageUrlResolver } from '../../../src/modules/photos/application/photo-image-url-resolver.js';
import { ApplyProcessingResultUseCase } from '../../../src/modules/photos/application/use-cases/apply-processing-result.use-case.js';
import { ConfirmUploadUseCase } from '../../../src/modules/photos/application/use-cases/confirm-upload.use-case.js';
import { CreatePhotosUseCase } from '../../../src/modules/photos/application/use-cases/create-photos.use-case.js';
import { ExpireStaleUploadsUseCase } from '../../../src/modules/photos/application/use-cases/expire-stale-uploads.use-case.js';
import { FileTooLargeError, TooManyPhotosError, PhotoNotFoundError, UploadNotFoundError } from '../../../src/modules/photos/domain/photo.errors.js';
import { PhotoStatus } from '../../../src/modules/photos/domain/photo-status.js';
import type { NewNotification } from '../../../src/modules/notifications/domain/notification.js';
import type { NotificationRepository } from '../../../src/modules/notifications/application/notification.repository.js';
import type { UnitOfWork } from '../../../src/shared/application/unit-of-work.js';
import { ForbiddenError } from '../../../src/shared/domain/errors.js';
import { FakeStorageGateway } from '../../helpers/fake-storage-gateway.js';
import { InMemoryPhotoRepository } from '../../helpers/in-memory-photo-repository.js';
import { buildPhoto, OWNER_ID, PHOTO_ID, STRANGER_ID } from '../../helpers/photo-factory.js';

const photographer = { id: OWNER_ID, role: 'PHOTOGRAPHER' as const };

describe('photo use cases', () => {
  let photos: InMemoryPhotoRepository;
  let storage: FakeStorageGateway;
  let images: PhotoImageUrlResolver;

  beforeEach(() => {
    photos = new InMemoryPhotoRepository();
    storage = new FakeStorageGateway();
    images = new PhotoImageUrlResolver(storage, 300);
  });

  describe('CreatePhotosUseCase', () => {
    const useCase = () =>
      new CreatePhotosUseCase(photos, storage, { maxPhotosPerUpload: 2, maxUploadSizeBytes: 5000, uploadUrlTtlSeconds: 600 });
    const input = { title: ' Largada ', price: '10.00', fileName: 'a.jpg', mimeType: 'image/jpeg', fileSize: 100 };

    it('persists pending photos with deterministic storage keys', async () => {
      const [created] = await useCase().execute(photographer, [input]);
      expect(created!.photo.status).toBe(PhotoStatus.UPLOADING);
      expect(created!.photo.title).toBe('Largada');
      expect(created!.photo.originalKey).toBe(`photos/${created!.photo.id}/original.jpg`);
      expect(photos.rows.size).toBe(1);
    });

    it('rejects non-photographers even if the route guard is bypassed', async () => {
      await expect(useCase().execute({ id: STRANGER_ID, role: 'USER' }, [input])).rejects.toBeInstanceOf(
        ForbiddenError,
      );
    });

    it('rejects batches above the configured limit', async () => {
      await expect(useCase().execute(photographer, [input, input, input])).rejects.toBeInstanceOf(TooManyPhotosError);
      expect(photos.rows.size).toBe(0);
    });

    it('rejects files over the configured limit without persisting', async () => {
      await expect(useCase().execute(photographer, [{ ...input, fileSize: 5001 }])).rejects.toBeInstanceOf(
        FileTooLargeError,
      );
      expect(photos.rows.size).toBe(0);
    });
  });

  describe('ConfirmUploadUseCase', () => {
    it('requires the object in storage', async () => {
      await photos.createMany([buildPhoto()]);
      const useCase = new ConfirmUploadUseCase(photos, storage, images);
      await expect(useCase.execute(photographer, PHOTO_ID)).rejects.toBeInstanceOf(UploadNotFoundError);

      storage.simulateUpload(`photos/${PHOTO_ID}/original.jpg`, 1000, 'image/jpeg');
      const view = await useCase.execute(photographer, PHOTO_ID);
      expect(view.photo.status).toBe(PhotoStatus.PROCESSING);
      expect(view.image?.variant).toBe('ORIGINAL');
    });

    it('hides the photo from other photographers', async () => {
      await photos.createMany([buildPhoto()]);
      const useCase = new ConfirmUploadUseCase(photos, storage, images);
      await expect(useCase.execute({ id: STRANGER_ID, role: 'PHOTOGRAPHER' }, PHOTO_ID)).rejects.toBeInstanceOf(
        PhotoNotFoundError,
      );
    });
  });

  describe('ApplyProcessingResultUseCase', () => {
    let created: NewNotification[];
    let unitOfWork: UnitOfWork;

    beforeEach(() => {
      created = [];
      const notifications = {
        create: async (data: NewNotification) => {
          created.push(data);
          return { ...data, id: 'n', readAt: null, createdAt: new Date() };
        },
      } as unknown as NotificationRepository;
      unitOfWork = {
        execute: (work) => work({ photos, notifications, comments: {} as never }),
      };
    });

    it('publishes and notifies once, ignoring redeliveries', async () => {
      await photos.createMany([buildPhoto({ status: PhotoStatus.PROCESSING })]);
      const useCase = new ApplyProcessingResultUseCase(unitOfWork);
      const result = { status: PhotoStatus.PUBLISHABLE, watermarkedKey: `photos/${PHOTO_ID}/watermarked.jpg` } as const;

      await useCase.execute(PHOTO_ID, result);
      await useCase.execute(PHOTO_ID, result);

      expect((await photos.findById(PHOTO_ID))?.status).toBe(PhotoStatus.PUBLISHABLE);
      expect(created).toHaveLength(1);
      expect(created[0]).toMatchObject({ type: 'PHOTO_PUBLISHED', userId: OWNER_ID });
    });

    it('marks PROCESSING without notifying', async () => {
      await photos.createMany([buildPhoto()]);
      await new ApplyProcessingResultUseCase(unitOfWork).execute(PHOTO_ID, { status: PhotoStatus.PROCESSING });
      expect((await photos.findById(PHOTO_ID))?.status).toBe(PhotoStatus.PROCESSING);
      expect(created).toHaveLength(0);
    });
  });

  describe('ExpireStaleUploadsUseCase', () => {
    it('expires uploads whose window ended before the grace period', async () => {
      const now = new Date('2026-11-08T12:00:00Z');
      await photos.createMany([
        buildPhoto({ uploadExpiresAt: new Date('2026-11-08T10:00:00Z') }),
        buildPhoto({ id: '1a2b3c4d-1111-4222-8333-444455556666', uploadExpiresAt: new Date('2026-11-08T11:30:00Z') }),
      ]);
      const result = await new ExpireStaleUploadsUseCase(photos, 60).execute(now);
      expect(result).toEqual({ expired: 1 });
    });
  });
});

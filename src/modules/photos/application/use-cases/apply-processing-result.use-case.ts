import type { UnitOfWork } from '../../../../shared/application/unit-of-work.js';
import { NotificationFactory } from '../../../notifications/domain/notification.js';
import type { Photo } from '../../domain/photo.js';
import { PhotoNotFoundError, PhotoStateChangedError } from '../../domain/photo.errors.js';
import { PhotoStatus } from '../../domain/photo-status.js';

export type ProcessingResult =
  | { status: typeof PhotoStatus.PROCESSING }
  | { status: typeof PhotoStatus.PUBLISHABLE; watermarkedKey: string }
  | { status: typeof PhotoStatus.ERROR; reason: string };

/** Idempotent: re-sending the current status is a no-op, so SQS redeliveries are safe. */
export class ApplyProcessingResultUseCase {
  constructor(private readonly unitOfWork: UnitOfWork) {}

  execute(photoId: string, result: ProcessingResult): Promise<Photo> {
    return this.unitOfWork.execute(async ({ photos, notifications }) => {
      const photo = await photos.findById(photoId);
      if (!photo) throw new PhotoNotFoundError();
      if (photo.status === result.status) return photo;

      const previousStatus = photo.status;

      switch (result.status) {
        case PhotoStatus.PROCESSING:
          photo.markUploadReceived();
          break;
        case PhotoStatus.PUBLISHABLE:
          if (photo.status === PhotoStatus.UPLOADING) photo.markUploadReceived();
          photo.publish(result.watermarkedKey, new Date());
          break;
        case PhotoStatus.ERROR:
          photo.fail(result.reason);
          break;
      }

      if (!(await photos.save(photo, previousStatus))) throw new PhotoStateChangedError();

      if (photo.status === PhotoStatus.PUBLISHABLE) {
        await notifications.create(NotificationFactory.photoPublished(photo));
      } else if (photo.status === PhotoStatus.ERROR) {
        await notifications.create(NotificationFactory.photoProcessingFailed(photo));
      }

      return photo;
    });
  }
}

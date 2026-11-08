import { z } from 'zod';
import { isoDateTime } from '../../../shared/presentation/http-schemas.js';
import { NotificationType, type Notification } from '../domain/notification.js';

export const notificationSchema = z
  .object({
    id: z.uuid(),
    type: z.enum([
      NotificationType.PHOTO_PUBLISHED,
      NotificationType.PHOTO_PROCESSING_FAILED,
      NotificationType.NEW_COMMENT,
    ]),
    title: z.string(),
    message: z.string(),
    photoId: z.uuid().nullable(),
    readAt: isoDateTime.nullable(),
    createdAt: isoDateTime,
  })
  .meta({ id: 'Notification' });

export function presentNotification(notification: Notification): z.infer<typeof notificationSchema> {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    photoId: notification.photoId,
    readAt: notification.readAt?.toISOString() ?? null,
    createdAt: notification.createdAt.toISOString(),
  };
}

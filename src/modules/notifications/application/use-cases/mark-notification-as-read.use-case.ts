import type { Actor } from '../../../../shared/domain/actor.js';
import type { Notification } from '../../domain/notification.js';
import { NotificationNotFoundError } from '../../domain/notification.errors.js';
import type { NotificationRepository } from '../notification.repository.js';

export class MarkNotificationAsReadUseCase {
  constructor(private readonly notifications: NotificationRepository) {}

  async execute(actor: Actor, notificationId: string): Promise<Notification> {
    const notification = await this.notifications.findById(notificationId);
    if (!notification || notification.userId !== actor.id) throw new NotificationNotFoundError();
    if (notification.readAt) return notification;
    return this.notifications.markAsRead(notification.id, new Date());
  }
}

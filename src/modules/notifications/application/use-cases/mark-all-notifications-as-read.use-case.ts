import type { Actor } from '../../../../shared/domain/actor.js';
import type { NotificationRepository } from '../notification.repository.js';

export class MarkAllNotificationsAsReadUseCase {
  constructor(private readonly notifications: NotificationRepository) {}

  async execute(actor: Actor): Promise<{ updated: number }> {
    return { updated: await this.notifications.markAllAsRead(actor.id, new Date()) };
  }
}

import type { Actor } from '../../../../shared/domain/actor.js';
import type { Page, PageRequest } from '../../../../shared/domain/pagination.js';
import type { Notification } from '../../domain/notification.js';
import type { NotificationRepository } from '../notification.repository.js';

export interface NotificationList extends Page<Notification> {
  unreadCount: number;
}

export class ListNotificationsUseCase {
  constructor(private readonly notifications: NotificationRepository) {}

  async execute(actor: Actor, unreadOnly: boolean, page: PageRequest): Promise<NotificationList> {
    const [result, unreadCount] = await Promise.all([
      this.notifications.listByUser(actor.id, { unreadOnly }, page),
      this.notifications.countUnread(actor.id),
    ]);
    return { ...result, unreadCount };
  }
}

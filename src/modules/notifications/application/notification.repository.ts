import type { Page, PageRequest } from '../../../shared/domain/pagination.js';
import type { NewNotification, Notification } from '../domain/notification.js';

export interface ListNotificationsFilter {
  unreadOnly: boolean;
}

export interface NotificationRepository {
  create(data: NewNotification): Promise<Notification>;
  findById(id: string): Promise<Notification | null>;
  listByUser(userId: string, filter: ListNotificationsFilter, page: PageRequest): Promise<Page<Notification>>;
  countUnread(userId: string): Promise<number>;
  markAsRead(id: string, readAt: Date): Promise<Notification>;
  markAllAsRead(userId: string, readAt: Date): Promise<number>;
}

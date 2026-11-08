import type { Notification as NotificationRow } from '../../../generated/prisma/client.js';
import type { Page, PageRequest } from '../../../shared/domain/pagination.js';
import {
  buildPage,
  decodeTimestampCursor,
  encodeTimestampCursor,
} from '../../../shared/infrastructure/database/cursor.js';
import type { PrismaExecutor } from '../../../shared/infrastructure/database/prisma-client.js';
import type {
  ListNotificationsFilter,
  NotificationRepository,
} from '../application/notification.repository.js';
import type { NewNotification, Notification } from '../domain/notification.js';

export class PrismaNotificationRepository implements NotificationRepository {
  constructor(private readonly db: PrismaExecutor) {}

  async create(data: NewNotification): Promise<Notification> {
    return toDomain(await this.db.notification.create({ data }));
  }

  async findById(id: string): Promise<Notification | null> {
    const row = await this.db.notification.findUnique({ where: { id } });
    return row && toDomain(row);
  }

  async listByUser(
    userId: string,
    filter: ListNotificationsFilter,
    page: PageRequest,
  ): Promise<Page<Notification>> {
    const cursor = decodeTimestampCursor(page.cursor);
    const rows = await this.db.notification.findMany({
      where: {
        userId,
        ...(filter.unreadOnly ? { readAt: null } : {}),
        ...(cursor
          ? {
              OR: [
                { createdAt: { lt: cursor.t } },
                { createdAt: cursor.t, id: { lt: cursor.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: page.limit + 1,
    });
    return buildPage(rows, page.limit, toDomain, (row) => encodeTimestampCursor(row.createdAt, row.id));
  }

  countUnread(userId: string): Promise<number> {
    return this.db.notification.count({ where: { userId, readAt: null } });
  }

  async markAsRead(id: string, readAt: Date): Promise<Notification> {
    return toDomain(await this.db.notification.update({ where: { id }, data: { readAt } }));
  }

  async markAllAsRead(userId: string, readAt: Date): Promise<number> {
    const result = await this.db.notification.updateMany({ where: { userId, readAt: null }, data: { readAt } });
    return result.count;
  }
}

function toDomain(row: NotificationRow): Notification {
  return {
    id: row.id,
    userId: row.userId,
    photoId: row.photoId,
    type: row.type,
    title: row.title,
    message: row.message,
    readAt: row.readAt,
    createdAt: row.createdAt,
  };
}

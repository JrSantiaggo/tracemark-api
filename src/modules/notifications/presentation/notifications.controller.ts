import { getActor } from '../../../shared/presentation/auth-guards.js';
import type { ZodReply, ZodRequest } from '../../../shared/presentation/route-types.js';
import type { ListNotificationsUseCase } from '../application/use-cases/list-notifications.use-case.js';
import type { MarkAllNotificationsAsReadUseCase } from '../application/use-cases/mark-all-notifications-as-read.use-case.js';
import type { MarkNotificationAsReadUseCase } from '../application/use-cases/mark-notification-as-read.use-case.js';
import { presentNotification } from './notification.presenter.js';
import type {
  listNotificationsSchema,
  markAllNotificationsAsReadSchema,
  markNotificationAsReadSchema,
} from './notifications.schemas.js';

export class NotificationsController {
  constructor(
    private readonly useCases: {
      listNotifications: ListNotificationsUseCase;
      markAsRead: MarkNotificationAsReadUseCase;
      markAllAsRead: MarkAllNotificationsAsReadUseCase;
    },
  ) {}

  list = async (
    request: ZodRequest<typeof listNotificationsSchema>,
    reply: ZodReply<typeof listNotificationsSchema>,
  ) => {
    const { unread, ...page } = request.query;
    const result = await this.useCases.listNotifications.execute(getActor(request), unread, page);
    return reply.send({
      data: result.items.map(presentNotification),
      nextCursor: result.nextCursor,
      unreadCount: result.unreadCount,
    });
  };

  markAsRead = async (
    request: ZodRequest<typeof markNotificationAsReadSchema>,
    reply: ZodReply<typeof markNotificationAsReadSchema>,
  ) => {
    const notification = await this.useCases.markAsRead.execute(getActor(request), request.params.id);
    return reply.send(presentNotification(notification));
  };

  markAllAsRead = async (
    request: ZodRequest<typeof markAllNotificationsAsReadSchema>,
    reply: ZodReply<typeof markAllNotificationsAsReadSchema>,
  ) => {
    return reply.send(await this.useCases.markAllAsRead.execute(getActor(request)));
  };
}

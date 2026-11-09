import type { CommentRepository } from '../../modules/comments/application/comment.repository.js';
import type { NotificationRepository } from '../../modules/notifications/application/notification.repository.js';
import type { PhotoRepository } from '../../modules/photos/application/photo.repository.js';
import type { PurchaseRepository } from '../../modules/purchases/application/purchase.repository.js';

export interface TransactionalRepositories {
  photos: PhotoRepository;
  comments: CommentRepository;
  notifications: NotificationRepository;
  purchases: PurchaseRepository;
}

export interface UnitOfWork {
  execute<T>(work: (repositories: TransactionalRepositories) => Promise<T>): Promise<T>;
}

import type { CommentRepository } from '../../modules/comments/application/comment.repository.js';
import type { NotificationRepository } from '../../modules/notifications/application/notification.repository.js';
import type { PhotoRepository } from '../../modules/photos/application/photo.repository.js';

export interface TransactionalRepositories {
  photos: PhotoRepository;
  comments: CommentRepository;
  notifications: NotificationRepository;
}

export interface UnitOfWork {
  execute<T>(work: (repositories: TransactionalRepositories) => Promise<T>): Promise<T>;
}

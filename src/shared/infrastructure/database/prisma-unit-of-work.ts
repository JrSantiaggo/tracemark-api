import type { TransactionalRepositories, UnitOfWork } from '../../application/unit-of-work.js';
import { PrismaCommentRepository } from '../../../modules/comments/infrastructure/prisma-comment.repository.js';
import { PrismaNotificationRepository } from '../../../modules/notifications/infrastructure/prisma-notification.repository.js';
import { PrismaPhotoRepository } from '../../../modules/photos/infrastructure/prisma-photo.repository.js';
import type { PrismaClient } from './prisma-client.js';

export class PrismaUnitOfWork implements UnitOfWork {
  constructor(private readonly prisma: PrismaClient) {}

  execute<T>(work: (repositories: TransactionalRepositories) => Promise<T>): Promise<T> {
    return this.prisma.$transaction((tx) =>
      work({
        photos: new PrismaPhotoRepository(tx),
        comments: new PrismaCommentRepository(tx),
        notifications: new PrismaNotificationRepository(tx),
      }),
    );
  }
}

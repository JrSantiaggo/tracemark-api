import type { UnitOfWork } from '../../../../shared/application/unit-of-work.js';
import type { Actor } from '../../../../shared/domain/actor.js';
import { NotificationFactory } from '../../../notifications/domain/notification.js';
import { PhotoNotFoundError } from '../../../photos/domain/photo.errors.js';
import type { CommentWithAuthor } from '../../domain/comment.js';

export class CreateCommentUseCase {
  constructor(private readonly unitOfWork: UnitOfWork) {}

  execute(actor: Actor, photoId: string, content: string): Promise<CommentWithAuthor> {
    return this.unitOfWork.execute(async ({ photos, comments, notifications }) => {
      const photo = await photos.findById(photoId);
      if (!photo || !photo.isVisibleTo(actor.id)) throw new PhotoNotFoundError();

      const created = await comments.create({ photoId, userId: actor.id, content: content.trim() });

      if (!photo.isOwnedBy(actor.id)) {
        await notifications.create(NotificationFactory.newComment(photo, created.author.name));
      }
      return created;
    });
  }
}

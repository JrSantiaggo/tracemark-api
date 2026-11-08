import type { Actor } from '../../../../shared/domain/actor.js';
import type { PhotoRepository } from '../../../photos/application/photo.repository.js';
import { CommentDeletionForbiddenError, CommentNotFoundError } from '../../domain/comment.errors.js';
import type { CommentRepository } from '../comment.repository.js';

export class DeleteCommentUseCase {
  constructor(
    private readonly photos: PhotoRepository,
    private readonly comments: CommentRepository,
  ) {}

  async execute(actor: Actor, commentId: string): Promise<void> {
    const comment = await this.comments.findById(commentId);
    if (!comment) throw new CommentNotFoundError();

    const photo = await this.photos.findById(comment.photoId);
    if (!photo || !photo.isVisibleTo(actor.id)) throw new CommentNotFoundError();

    if (comment.userId !== actor.id && !photo.isOwnedBy(actor.id)) {
      throw new CommentDeletionForbiddenError();
    }
    await this.comments.delete(comment.id);
  }
}

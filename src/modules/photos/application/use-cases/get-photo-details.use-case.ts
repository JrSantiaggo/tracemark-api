import type { Actor } from '../../../../shared/domain/actor.js';
import type { Page } from '../../../../shared/domain/pagination.js';
import type { CommentRepository } from '../../../comments/application/comment.repository.js';
import type { CommentWithAuthor } from '../../../comments/domain/comment.js';
import { PhotoNotFoundError } from '../../domain/photo.errors.js';
import type { PhotoImageUrlResolver, PhotoView } from '../photo-image-url-resolver.js';
import type { PhotoRepository } from '../photo.repository.js';

export interface PhotoDetails extends PhotoView {
  comments: Page<CommentWithAuthor>;
}

export class GetPhotoDetailsUseCase {
  constructor(
    private readonly photos: PhotoRepository,
    private readonly comments: CommentRepository,
    private readonly images: PhotoImageUrlResolver,
    private readonly commentsPageSize: number,
  ) {}

  async execute(actor: Actor, photoId: string): Promise<PhotoDetails> {
    const entry = await this.photos.findByIdWithPhotographer(photoId);
    if (!entry || !entry.photo.isVisibleTo(actor.id)) throw new PhotoNotFoundError();

    const [view, comments] = await Promise.all([
      this.images.toView(entry, actor.id),
      this.comments.listByPhoto(photoId, { limit: this.commentsPageSize }),
    ]);
    return { ...view, comments };
  }
}

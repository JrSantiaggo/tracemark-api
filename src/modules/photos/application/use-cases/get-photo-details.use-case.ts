import type { Actor } from '../../../../shared/domain/actor.js';
import type { Page } from '../../../../shared/domain/pagination.js';
import type { CommentRepository } from '../../../comments/application/comment.repository.js';
import type { CommentWithAuthor } from '../../../comments/domain/comment.js';
import type { PurchaseRepository } from '../../../purchases/application/purchase.repository.js';
import { PhotoNotFoundError } from '../../domain/photo.errors.js';
import type { PhotoImageUrlResolver, PhotoView } from '../photo-image-url-resolver.js';
import type { PhotoRepository } from '../photo.repository.js';

export interface PhotoDetails extends PhotoView {
  comments: Page<CommentWithAuthor>;
  purchasedAt: Date | null;
}

export class GetPhotoDetailsUseCase {
  constructor(
    private readonly photos: PhotoRepository,
    private readonly comments: CommentRepository,
    private readonly purchases: PurchaseRepository,
    private readonly images: PhotoImageUrlResolver,
    private readonly commentsPageSize: number,
  ) {}

  async execute(actor: Actor, photoId: string): Promise<PhotoDetails> {
    const entry = await this.photos.findByIdWithPhotographer(photoId);
    if (!entry || !entry.photo.isVisibleTo(actor.id)) throw new PhotoNotFoundError();

    const [view, comments, purchase] = await Promise.all([
      this.images.toView(entry, actor.id),
      this.comments.listByPhoto(photoId, { limit: this.commentsPageSize }),
      entry.photo.isOwnedBy(actor.id) ? null : this.purchases.findByPhotoAndBuyer(photoId, actor.id),
    ]);
    return { ...view, comments, purchasedAt: purchase?.createdAt ?? null };
  }
}

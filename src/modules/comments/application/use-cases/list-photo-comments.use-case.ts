import type { Actor } from '../../../../shared/domain/actor.js';
import type { Page, PageRequest } from '../../../../shared/domain/pagination.js';
import type { PhotoRepository } from '../../../photos/application/photo.repository.js';
import { PhotoNotFoundError } from '../../../photos/domain/photo.errors.js';
import type { CommentWithAuthor } from '../../domain/comment.js';
import type { CommentRepository } from '../comment.repository.js';

export class ListPhotoCommentsUseCase {
  constructor(
    private readonly photos: PhotoRepository,
    private readonly comments: CommentRepository,
  ) {}

  async execute(actor: Actor, photoId: string, page: PageRequest): Promise<Page<CommentWithAuthor>> {
    const photo = await this.photos.findById(photoId);
    if (!photo || !photo.isVisibleTo(actor.id)) throw new PhotoNotFoundError();
    return this.comments.listByPhoto(photoId, page);
  }
}

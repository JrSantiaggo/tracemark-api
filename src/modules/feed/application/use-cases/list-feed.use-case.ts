import type { Actor } from '../../../../shared/domain/actor.js';
import type { Page, PageRequest } from '../../../../shared/domain/pagination.js';
import type {
  PhotoImageUrlResolver,
  PhotoView,
} from '../../../photos/application/photo-image-url-resolver.js';
import type { PhotoRepository } from '../../../photos/application/photo.repository.js';

export class ListFeedUseCase {
  constructor(
    private readonly photos: PhotoRepository,
    private readonly images: PhotoImageUrlResolver,
  ) {}

  async execute(actor: Actor, page: PageRequest): Promise<Page<PhotoView>> {
    const result = await this.photos.listPublishable(page);
    const items = await Promise.all(result.items.map((entry) => this.images.toView(entry, actor.id)));
    return { items, nextCursor: result.nextCursor };
  }
}

import type { Actor } from '../../../../shared/domain/actor.js';
import { ForbiddenError } from '../../../../shared/domain/errors.js';
import type { Page, PageRequest } from '../../../../shared/domain/pagination.js';
import { UserRole } from '../../../../shared/domain/user-role.js';
import type { PhotoStatus } from '../../domain/photo-status.js';
import type { PhotoImageUrlResolver, PhotoView } from '../photo-image-url-resolver.js';
import type { PhotoRepository } from '../photo.repository.js';

export class ListMyPhotosUseCase {
  constructor(
    private readonly photos: PhotoRepository,
    private readonly images: PhotoImageUrlResolver,
  ) {}

  async execute(
    actor: Actor,
    status: PhotoStatus | undefined,
    page: PageRequest,
  ): Promise<Page<PhotoView>> {
    if (actor.role !== UserRole.PHOTOGRAPHER) {
      throw new ForbiddenError('PHOTOGRAPHER_ONLY', 'Apenas fotógrafos possuem fotografias próprias.');
    }

    const result = await this.photos.listByPhotographer(actor.id, { status }, page);
    const items = await Promise.all(result.items.map((entry) => this.images.toView(entry, actor.id)));
    return { items, nextCursor: result.nextCursor };
  }
}

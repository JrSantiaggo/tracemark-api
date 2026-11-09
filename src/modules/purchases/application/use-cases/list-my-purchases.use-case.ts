import type { Actor } from '../../../../shared/domain/actor.js';
import type { Page, PageRequest } from '../../../../shared/domain/pagination.js';
import type { PhotoImageUrlResolver, PhotoView } from '../../../photos/application/photo-image-url-resolver.js';
import type { Purchase } from '../../domain/purchase.js';
import type { PurchaseRepository } from '../purchase.repository.js';

export interface PurchaseView {
  purchase: Purchase;
  photo: PhotoView;
}

export class ListMyPurchasesUseCase {
  constructor(
    private readonly purchases: PurchaseRepository,
    private readonly images: PhotoImageUrlResolver,
  ) {}

  async execute(actor: Actor, page: PageRequest): Promise<Page<PurchaseView>> {
    const result = await this.purchases.listByBuyer(actor.id, page);
    const items = await Promise.all(
      result.items.map(async ({ purchase, entry }) => ({
        purchase,
        photo: await this.images.toView(entry, actor.id),
      })),
    );
    return { items, nextCursor: result.nextCursor };
  }
}

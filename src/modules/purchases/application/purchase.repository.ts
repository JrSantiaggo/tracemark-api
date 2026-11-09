import type { Page, PageRequest } from '../../../shared/domain/pagination.js';
import type { PhotoWithPhotographer } from '../../photos/application/photo.repository.js';
import type { NewPurchase, Purchase, PurchaseWithBuyer } from '../domain/purchase.js';

export interface PurchasedPhoto {
  purchase: Purchase;
  entry: PhotoWithPhotographer;
}

export interface PurchaseRepository {
  /** Throws PhotoAlreadyPurchasedError when the buyer already owns this photo. */
  create(data: NewPurchase): Promise<PurchaseWithBuyer>;
  findByPhotoAndBuyer(photoId: string, buyerId: string): Promise<Purchase | null>;
  listByBuyer(buyerId: string, page: PageRequest): Promise<Page<PurchasedPhoto>>;
}

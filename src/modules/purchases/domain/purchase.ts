import type { UserSummary } from '../../../shared/domain/pagination.js';

export interface Purchase {
  id: string;
  photoId: string;
  buyerId: string;
  /** Price paid, frozen at purchase time. Decimal string, e.g. "49.90". */
  price: string;
  createdAt: Date;
}

export interface PurchaseWithBuyer extends Purchase {
  buyer: UserSummary;
}

export type NewPurchase = Pick<Purchase, 'photoId' | 'buyerId' | 'price'>;

import type { UnitOfWork } from '../../../../shared/application/unit-of-work.js';
import type { Actor } from '../../../../shared/domain/actor.js';
import { NotificationFactory } from '../../../notifications/domain/notification.js';
import { PhotoNotFoundError } from '../../../photos/domain/photo.errors.js';
import type { PurchaseWithBuyer } from '../../domain/purchase.js';
import { CannotPurchaseOwnPhotoError } from '../../domain/purchase.errors.js';

export class PurchasePhotoUseCase {
  constructor(private readonly unitOfWork: UnitOfWork) {}

  execute(actor: Actor, photoId: string): Promise<PurchaseWithBuyer> {
    return this.unitOfWork.execute(async ({ photos, purchases, notifications }) => {
      const photo = await photos.findById(photoId);
      if (!photo || !photo.isVisibleTo(actor.id)) throw new PhotoNotFoundError();
      if (photo.isOwnedBy(actor.id)) throw new CannotPurchaseOwnPhotoError();

      const purchase = await purchases.create({ photoId, buyerId: actor.id, price: photo.price });
      await notifications.create(NotificationFactory.photoSold(photo, purchase.buyer.name));
      return purchase;
    });
  }
}

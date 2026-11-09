import { getActor } from '../../../shared/presentation/auth-guards.js';
import type { ZodReply, ZodRequest } from '../../../shared/presentation/route-types.js';
import type { GetOriginalDownloadUseCase } from '../application/use-cases/get-original-download.use-case.js';
import type { ListMyPurchasesUseCase } from '../application/use-cases/list-my-purchases.use-case.js';
import type { PurchasePhotoUseCase } from '../application/use-cases/purchase-photo.use-case.js';
import { presentOriginalDownload, presentPurchase, presentPurchasedPhoto } from './purchase.presenter.js';
import type { downloadOriginalSchema, listMyPurchasesSchema, purchasePhotoSchema } from './purchases.schemas.js';

export class PurchasesController {
  constructor(
    private readonly useCases: {
      purchasePhoto: PurchasePhotoUseCase;
      getOriginalDownload: GetOriginalDownloadUseCase;
      listMyPurchases: ListMyPurchasesUseCase;
    },
  ) {}

  purchase = async (request: ZodRequest<typeof purchasePhotoSchema>, reply: ZodReply<typeof purchasePhotoSchema>) => {
    const purchase = await this.useCases.purchasePhoto.execute(getActor(request), request.params.id);
    return reply.status(201).send(presentPurchase(purchase));
  };

  download = async (
    request: ZodRequest<typeof downloadOriginalSchema>,
    reply: ZodReply<typeof downloadOriginalSchema>,
  ) => {
    const download = await this.useCases.getOriginalDownload.execute(getActor(request), request.params.id);
    return reply.header('cache-control', 'no-store').send(presentOriginalDownload(download));
  };

  listMine = async (
    request: ZodRequest<typeof listMyPurchasesSchema>,
    reply: ZodReply<typeof listMyPurchasesSchema>,
  ) => {
    const page = await this.useCases.listMyPurchases.execute(getActor(request), request.query);
    return reply.send({ data: page.items.map(presentPurchasedPhoto), nextCursor: page.nextCursor });
  };
}

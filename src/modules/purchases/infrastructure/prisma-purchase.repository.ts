import { Prisma, type Purchase as PurchaseRow } from '../../../generated/prisma/client.js';
import type { Page, PageRequest } from '../../../shared/domain/pagination.js';
import {
  buildPage,
  decodeTimestampCursor,
  encodeTimestampCursor,
} from '../../../shared/infrastructure/database/cursor.js';
import type { PrismaExecutor } from '../../../shared/infrastructure/database/prisma-client.js';
import { isUniqueConstraintViolation } from '../../../shared/infrastructure/database/prisma-errors.js';
import {
  photoWithPhotographerInclude,
  toPhotoEntry,
} from '../../photos/infrastructure/prisma-photo.repository.js';
import type { PurchasedPhoto, PurchaseRepository } from '../application/purchase.repository.js';
import type { NewPurchase, Purchase, PurchaseWithBuyer } from '../domain/purchase.js';
import { PhotoAlreadyPurchasedError } from '../domain/purchase.errors.js';

export class PrismaPurchaseRepository implements PurchaseRepository {
  constructor(private readonly db: PrismaExecutor) {}

  async create(data: NewPurchase): Promise<PurchaseWithBuyer> {
    try {
      const row = await this.db.purchase.create({
        data: { ...data, price: new Prisma.Decimal(data.price) },
        include: { buyer: { select: { id: true, name: true } } },
      });
      return { ...toDomain(row), buyer: row.buyer };
    } catch (error) {
      if (isUniqueConstraintViolation(error)) throw new PhotoAlreadyPurchasedError();
      throw error;
    }
  }

  async findByPhotoAndBuyer(photoId: string, buyerId: string): Promise<Purchase | null> {
    const row = await this.db.purchase.findUnique({ where: { photoId_buyerId: { photoId, buyerId } } });
    return row && toDomain(row);
  }

  async listByBuyer(buyerId: string, page: PageRequest): Promise<Page<PurchasedPhoto>> {
    const cursor = decodeTimestampCursor(page.cursor);
    const rows = await this.db.purchase.findMany({
      where: {
        buyerId,
        ...(cursor
          ? {
              OR: [
                { createdAt: { lt: cursor.t } },
                { createdAt: cursor.t, id: { lt: cursor.id } },
              ],
            }
          : {}),
      },
      include: { photo: { include: photoWithPhotographerInclude } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: page.limit + 1,
    });
    return buildPage(
      rows,
      page.limit,
      (row) => ({ purchase: toDomain(row), entry: toPhotoEntry(row.photo) }),
      (row) => encodeTimestampCursor(row.createdAt, row.id),
    );
  }
}

function toDomain(row: PurchaseRow): Purchase {
  return {
    id: row.id,
    photoId: row.photoId,
    buyerId: row.buyerId,
    price: row.price.toFixed(2),
    createdAt: row.createdAt,
  };
}

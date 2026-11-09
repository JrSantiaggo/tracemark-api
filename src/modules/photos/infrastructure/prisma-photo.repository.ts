import { Prisma, type Photo as PhotoRow } from '../../../generated/prisma/client.js';
import type { Page, PageRequest } from '../../../shared/domain/pagination.js';
import {
  buildPage,
  decodeTimestampCursor,
  encodeTimestampCursor,
} from '../../../shared/infrastructure/database/cursor.js';
import type { PrismaExecutor } from '../../../shared/infrastructure/database/prisma-client.js';
import type { PhotoRepository, PhotoWithPhotographer } from '../application/photo.repository.js';
import { Photo } from '../domain/photo.js';
import { PhotoStatus } from '../domain/photo-status.js';

export const photoWithPhotographerInclude = { photographer: { select: { id: true, name: true } } } as const;
type PhotoRowWithPhotographer = PhotoRow & { photographer: { id: string; name: string } };

export class PrismaPhotoRepository implements PhotoRepository {
  constructor(private readonly db: PrismaExecutor) {}

  async createMany(photos: Photo[]): Promise<void> {
    await this.db.photo.createMany({ data: photos.map(toPersistence) });
  }

  async findById(id: string): Promise<Photo | null> {
    const row = await this.db.photo.findUnique({ where: { id } });
    return row && toDomain(row);
  }

  async findByIdWithPhotographer(id: string): Promise<PhotoWithPhotographer | null> {
    const row = await this.db.photo.findUnique({ where: { id }, include: photoWithPhotographerInclude });
    return row && toPhotoEntry(row);
  }

  async save(photo: Photo, expectedStatus: PhotoStatus): Promise<boolean> {
    const { id, photographerId, createdAt, updatedAt, ...changes } = toPersistence(photo);
    const result = await this.db.photo.updateMany({
      where: { id, status: expectedStatus },
      data: changes,
    });
    return result.count === 1;
  }

  async listByPhotographer(
    photographerId: string,
    filter: { status?: PhotoStatus | undefined },
    page: PageRequest,
  ): Promise<Page<PhotoWithPhotographer>> {
    const cursor = decodeTimestampCursor(page.cursor);
    const rows = await this.db.photo.findMany({
      where: {
        photographerId,
        ...(filter.status ? { status: filter.status } : {}),
        ...(cursor
          ? {
              OR: [
                { createdAt: { lt: cursor.t } },
                { createdAt: cursor.t, id: { lt: cursor.id } },
              ],
            }
          : {}),
      },
      include: photoWithPhotographerInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: page.limit + 1,
    });
    return buildPage(rows, page.limit, toPhotoEntry, (row) => encodeTimestampCursor(row.createdAt, row.id));
  }

  async listPublishable(page: PageRequest): Promise<Page<PhotoWithPhotographer>> {
    const cursor = decodeTimestampCursor(page.cursor);
    const rows = await this.db.photo.findMany({
      where: {
        status: PhotoStatus.PUBLISHABLE,
        ...(cursor
          ? {
              OR: [
                { publishedAt: { lt: cursor.t } },
                { publishedAt: cursor.t, id: { lt: cursor.id } },
              ],
            }
          : {}),
      },
      include: photoWithPhotographerInclude,
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      take: page.limit + 1,
    });
    return buildPage(rows, page.limit, toPhotoEntry, (row) =>
      encodeTimestampCursor(row.publishedAt ?? row.createdAt, row.id),
    );
  }

  async expireStaleUploads(expiredBefore: Date, reason: string): Promise<number> {
    const result = await this.db.photo.updateMany({
      where: { status: PhotoStatus.UPLOADING, uploadExpiresAt: { lt: expiredBefore } },
      data: { status: PhotoStatus.ERROR, processingError: reason },
    });
    return result.count;
  }
}

export function toPhotoEntry(row: PhotoRowWithPhotographer): PhotoWithPhotographer {
  return { photo: toDomain(row), photographer: row.photographer };
}

function toDomain(row: PhotoRow): Photo {
  return Photo.restore({
    id: row.id,
    photographerId: row.photographerId,
    title: row.title,
    description: row.description,
    eventName: row.eventName,
    takenAt: row.takenAt,
    price: row.price.toFixed(2),
    originalKey: row.originalKey,
    watermarkedKey: row.watermarkedKey,
    status: row.status,
    mimeType: row.mimeType,
    fileSize: row.fileSize,
    processingError: row.processingError,
    uploadExpiresAt: row.uploadExpiresAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    publishedAt: row.publishedAt,
  });
}

function toPersistence(photo: Photo): Prisma.PhotoCreateManyInput {
  const props = photo.toSnapshot();
  return { ...props, price: new Prisma.Decimal(props.price) };
}

import type { Comment as CommentRow } from '../../../generated/prisma/client.js';
import type { Page, PageRequest } from '../../../shared/domain/pagination.js';
import {
  buildPage,
  decodeTimestampCursor,
  encodeTimestampCursor,
} from '../../../shared/infrastructure/database/cursor.js';
import type { PrismaExecutor } from '../../../shared/infrastructure/database/prisma-client.js';
import type { CommentRepository, CreateCommentData } from '../application/comment.repository.js';
import type { Comment, CommentWithAuthor } from '../domain/comment.js';

const withAuthor = { author: { select: { id: true, name: true } } } as const;
type CommentRowWithAuthor = CommentRow & { author: { id: string; name: string } };

export class PrismaCommentRepository implements CommentRepository {
  constructor(private readonly db: PrismaExecutor) {}

  async create(data: CreateCommentData): Promise<CommentWithAuthor> {
    return toEntry(await this.db.comment.create({ data, include: withAuthor }));
  }

  async findById(id: string): Promise<Comment | null> {
    const row = await this.db.comment.findUnique({ where: { id } });
    return row && toDomain(row);
  }

  async listByPhoto(photoId: string, page: PageRequest): Promise<Page<CommentWithAuthor>> {
    const cursor = decodeTimestampCursor(page.cursor);
    const rows = await this.db.comment.findMany({
      where: {
        photoId,
        ...(cursor
          ? {
              OR: [
                { createdAt: { gt: cursor.t } },
                { createdAt: cursor.t, id: { gt: cursor.id } },
              ],
            }
          : {}),
      },
      include: withAuthor,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: page.limit + 1,
    });
    return buildPage(rows, page.limit, toEntry, (row) => encodeTimestampCursor(row.createdAt, row.id));
  }

  async delete(id: string): Promise<void> {
    await this.db.comment.delete({ where: { id } });
  }
}

function toEntry(row: CommentRowWithAuthor): CommentWithAuthor {
  return { comment: toDomain(row), author: row.author };
}

function toDomain(row: CommentRow): Comment {
  return {
    id: row.id,
    photoId: row.photoId,
    userId: row.userId,
    content: row.content,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

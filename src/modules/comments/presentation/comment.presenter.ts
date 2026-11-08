import { z } from 'zod';
import { isoDateTime, userSummarySchema } from '../../../shared/presentation/http-schemas.js';
import type { CommentWithAuthor } from '../domain/comment.js';

export const commentSchema = z
  .object({
    id: z.uuid(),
    photoId: z.uuid(),
    content: z.string(),
    author: userSummarySchema,
    createdAt: isoDateTime,
    updatedAt: isoDateTime,
  })
  .meta({ id: 'Comment' });

export function presentComment({ comment, author }: CommentWithAuthor): z.infer<typeof commentSchema> {
  return {
    id: comment.id,
    photoId: comment.photoId,
    content: comment.content,
    author,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
  };
}

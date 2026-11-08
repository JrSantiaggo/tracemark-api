import type { UserSummary } from '../../../shared/domain/pagination.js';

export interface Comment {
  id: string;
  photoId: string;
  userId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommentWithAuthor {
  comment: Comment;
  author: UserSummary;
}

export const COMMENT_MAX_LENGTH = 1000;

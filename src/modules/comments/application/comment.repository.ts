import type { Page, PageRequest } from '../../../shared/domain/pagination.js';
import type { Comment, CommentWithAuthor } from '../domain/comment.js';

export interface CreateCommentData {
  photoId: string;
  userId: string;
  content: string;
}

export interface CommentRepository {
  create(data: CreateCommentData): Promise<CommentWithAuthor>;
  findById(id: string): Promise<Comment | null>;
  listByPhoto(photoId: string, page: PageRequest): Promise<Page<CommentWithAuthor>>;
  delete(id: string): Promise<void>;
}

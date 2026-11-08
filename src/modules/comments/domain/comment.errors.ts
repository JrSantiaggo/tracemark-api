import { ForbiddenError, NotFoundError } from '../../../shared/domain/errors.js';

export class CommentNotFoundError extends NotFoundError {
  constructor() {
    super('COMMENT_NOT_FOUND', 'Comentário não encontrado.');
  }
}

export class CommentDeletionForbiddenError extends ForbiddenError {
  constructor() {
    super('COMMENT_DELETION_FORBIDDEN', 'Apenas o autor do comentário ou o dono da fotografia podem excluí-lo.');
  }
}

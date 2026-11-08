import { getActor } from '../../../shared/presentation/auth-guards.js';
import type { ZodReply, ZodRequest } from '../../../shared/presentation/route-types.js';
import type { CreateCommentUseCase } from '../application/use-cases/create-comment.use-case.js';
import type { DeleteCommentUseCase } from '../application/use-cases/delete-comment.use-case.js';
import type { ListPhotoCommentsUseCase } from '../application/use-cases/list-photo-comments.use-case.js';
import { presentComment } from './comment.presenter.js';
import type { createCommentSchema, deleteCommentSchema, listCommentsSchema } from './comments.schemas.js';

export class CommentsController {
  constructor(
    private readonly useCases: {
      createComment: CreateCommentUseCase;
      listPhotoComments: ListPhotoCommentsUseCase;
      deleteComment: DeleteCommentUseCase;
    },
  ) {}

  create = async (request: ZodRequest<typeof createCommentSchema>, reply: ZodReply<typeof createCommentSchema>) => {
    const comment = await this.useCases.createComment.execute(
      getActor(request),
      request.params.photoId,
      request.body.content,
    );
    return reply.status(201).send(presentComment(comment));
  };

  list = async (request: ZodRequest<typeof listCommentsSchema>, reply: ZodReply<typeof listCommentsSchema>) => {
    const page = await this.useCases.listPhotoComments.execute(
      getActor(request),
      request.params.photoId,
      request.query,
    );
    return reply.send({ data: page.items.map(presentComment), nextCursor: page.nextCursor });
  };

  delete = async (request: ZodRequest<typeof deleteCommentSchema>, reply: ZodReply<typeof deleteCommentSchema>) => {
    await this.useCases.deleteComment.execute(getActor(request), request.params.id);
    return reply.status(204).send(null);
  };
}

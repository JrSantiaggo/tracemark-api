import { getActor } from '../../../shared/presentation/auth-guards.js';
import type { ZodReply, ZodRequest } from '../../../shared/presentation/route-types.js';
import { presentPhoto } from '../../photos/presentation/photo.presenter.js';
import type { ListFeedUseCase } from '../application/use-cases/list-feed.use-case.js';
import type { listFeedSchema } from './feed.schemas.js';

export class FeedController {
  constructor(private readonly listFeed: ListFeedUseCase) {}

  list = async (request: ZodRequest<typeof listFeedSchema>, reply: ZodReply<typeof listFeedSchema>) => {
    const page = await this.listFeed.execute(getActor(request), request.query);
    return reply.send({ data: page.items.map(presentPhoto), nextCursor: page.nextCursor });
  };
}

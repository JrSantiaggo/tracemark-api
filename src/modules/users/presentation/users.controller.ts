import { getActor } from '../../../shared/presentation/auth-guards.js';
import type { ZodReply, ZodRequest } from '../../../shared/presentation/route-types.js';
import type { GetPublicProfileUseCase } from '../application/use-cases/get-public-profile.use-case.js';
import type { UpdateMyProfileUseCase } from '../application/use-cases/update-my-profile.use-case.js';
import { presentPrivateUser, presentPublicUser } from './user.presenter.js';
import type { getPublicProfileSchema, updateMyProfileSchema } from './users.schemas.js';

export class UsersController {
  constructor(
    private readonly useCases: {
      getPublicProfile: GetPublicProfileUseCase;
      updateMyProfile: UpdateMyProfileUseCase;
    },
  ) {}

  getPublicProfile = async (
    request: ZodRequest<typeof getPublicProfileSchema>,
    reply: ZodReply<typeof getPublicProfileSchema>,
  ) => {
    const user = await this.useCases.getPublicProfile.execute(request.params.id);
    return reply.send(presentPublicUser(user));
  };

  updateMyProfile = async (
    request: ZodRequest<typeof updateMyProfileSchema>,
    reply: ZodReply<typeof updateMyProfileSchema>,
  ) => {
    const user = await this.useCases.updateMyProfile.execute(getActor(request), request.body);
    return reply.send(presentPrivateUser(user));
  };
}

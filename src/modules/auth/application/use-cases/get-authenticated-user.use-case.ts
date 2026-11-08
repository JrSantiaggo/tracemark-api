import type { Actor } from '../../../../shared/domain/actor.js';
import { UnauthorizedError } from '../../../../shared/domain/errors.js';
import type { UserRepository } from '../../../users/application/user.repository.js';
import type { User } from '../../../users/domain/user.js';

export class GetAuthenticatedUserUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(actor: Actor): Promise<User> {
    const user = await this.users.findById(actor.id);
    if (!user) throw new UnauthorizedError('INVALID_TOKEN', 'Token inválido ou expirado.');
    return user;
  }
}

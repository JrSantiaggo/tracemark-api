import type { Actor } from '../../../../shared/domain/actor.js';
import type { User } from '../../domain/user.js';
import { UserNotFoundError } from '../../domain/user.errors.js';
import type { UpdateUserData, UserRepository } from '../user.repository.js';

export class UpdateMyProfileUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(actor: Actor, data: UpdateUserData): Promise<User> {
    const user = await this.users.findById(actor.id);
    if (!user) throw new UserNotFoundError();
    return this.users.update(actor.id, data);
  }
}

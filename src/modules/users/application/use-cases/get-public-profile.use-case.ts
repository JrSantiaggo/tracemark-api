import type { User } from '../../domain/user.js';
import { UserNotFoundError } from '../../domain/user.errors.js';
import type { UserRepository } from '../user.repository.js';

export class GetPublicProfileUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(userId: string): Promise<User> {
    const user = await this.users.findById(userId);
    if (!user) throw new UserNotFoundError();
    return user;
  }
}

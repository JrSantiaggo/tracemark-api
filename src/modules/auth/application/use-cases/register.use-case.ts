import type { PasswordHasher } from '../../../../shared/application/ports/password-hasher.js';
import type { IssuedToken, TokenService } from '../../../../shared/application/ports/token-service.js';
import type { UserRole } from '../../../../shared/domain/user-role.js';
import type { UserRepository } from '../../../users/application/user.repository.js';
import { normalizeEmail, type User } from '../../../users/domain/user.js';
import { EmailAlreadyInUseError } from '../../../users/domain/user.errors.js';

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface AuthResult extends IssuedToken {
  user: User;
}

export class RegisterUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokens: TokenService,
  ) {}

  async execute(input: RegisterInput): Promise<AuthResult> {
    const email = normalizeEmail(input.email);
    if (await this.users.findByEmail(email)) throw new EmailAlreadyInUseError();

    const user = await this.users.create({
      name: input.name.trim(),
      email,
      passwordHash: await this.passwordHasher.hash(input.password),
      role: input.role,
    });

    return { user, ...this.tokens.issue({ id: user.id, role: user.role }) };
  }
}

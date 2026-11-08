import type { PasswordHasher } from '../../../../shared/application/ports/password-hasher.js';
import type { TokenService } from '../../../../shared/application/ports/token-service.js';
import type { UserRepository } from '../../../users/application/user.repository.js';
import { normalizeEmail } from '../../../users/domain/user.js';
import { InvalidCredentialsError } from '../../domain/auth.errors.js';
import type { AuthResult } from './register.use-case.js';

export interface LoginInput {
  email: string;
  password: string;
}

export class LoginUseCase {
  private dummyHash: Promise<string> | undefined;

  constructor(
    private readonly users: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokens: TokenService,
  ) {}

  async execute(input: LoginInput): Promise<AuthResult> {
    const user = await this.users.findByEmail(normalizeEmail(input.email));

    // Verify against a dummy hash when the user does not exist so response time does not reveal registered e-mails.
    const hash = user?.passwordHash ?? (await this.getDummyHash());
    const valid = await this.passwordHasher.verify(hash, input.password);
    if (!user || !valid) throw new InvalidCredentialsError();

    return { user, ...this.tokens.issue({ id: user.id, role: user.role }) };
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= this.passwordHasher.hash('tracemark-dummy-password');
    return this.dummyHash;
  }
}

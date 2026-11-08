import { getActor } from '../../../shared/presentation/auth-guards.js';
import type { ZodReply, ZodRequest } from '../../../shared/presentation/route-types.js';
import { presentPrivateUser } from '../../users/presentation/user.presenter.js';
import type { GetAuthenticatedUserUseCase } from '../application/use-cases/get-authenticated-user.use-case.js';
import type { LoginUseCase } from '../application/use-cases/login.use-case.js';
import type { AuthResult, RegisterUseCase } from '../application/use-cases/register.use-case.js';
import type { loginSchema, meSchema, registerSchema } from './auth.schemas.js';

export class AuthController {
  constructor(
    private readonly useCases: {
      register: RegisterUseCase;
      login: LoginUseCase;
      getAuthenticatedUser: GetAuthenticatedUserUseCase;
    },
  ) {}

  register = async (request: ZodRequest<typeof registerSchema>, reply: ZodReply<typeof registerSchema>) => {
    const result = await this.useCases.register.execute(request.body);
    return reply.status(201).send(presentAuthResult(result));
  };

  login = async (request: ZodRequest<typeof loginSchema>, reply: ZodReply<typeof loginSchema>) => {
    const result = await this.useCases.login.execute(request.body);
    return reply.send(presentAuthResult(result));
  };

  me = async (request: ZodRequest<typeof meSchema>, reply: ZodReply<typeof meSchema>) => {
    const user = await this.useCases.getAuthenticatedUser.execute(getActor(request));
    return reply.send(presentPrivateUser(user));
  };
}

function presentAuthResult(result: AuthResult) {
  return {
    accessToken: result.accessToken,
    tokenType: 'Bearer' as const,
    expiresIn: result.expiresInSeconds,
    user: presentPrivateUser(result.user),
  };
}

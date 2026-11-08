import { createSigner, createVerifier } from 'fast-jwt';
import { z } from 'zod';
import type { IssuedToken, TokenService } from '../../application/ports/token-service.js';
import type { Actor } from '../../domain/actor.js';
import { UnauthorizedError } from '../../domain/errors.js';
import { UserRole } from '../../domain/user-role.js';

const ISSUER = 'tracemark-api';

const payloadSchema = z.object({
  sub: z.uuid(),
  role: z.enum([UserRole.PHOTOGRAPHER, UserRole.USER]),
});

export class JwtTokenService implements TokenService {
  private readonly sign: (payload: Record<string, unknown>) => string;
  private readonly decode: (token: string) => unknown;

  constructor(
    secret: string,
    private readonly expiresInSeconds: number,
  ) {
    this.sign = createSigner({
      key: secret,
      algorithm: 'HS256',
      expiresIn: expiresInSeconds * 1000,
      iss: ISSUER,
    });
    this.decode = createVerifier({ key: secret, algorithms: ['HS256'], allowedIss: ISSUER });
  }

  issue(actor: Actor): IssuedToken {
    return {
      accessToken: this.sign({ sub: actor.id, role: actor.role }),
      expiresInSeconds: this.expiresInSeconds,
    };
  }

  verify(token: string): Actor {
    try {
      const payload = payloadSchema.parse(this.decode(token));
      return { id: payload.sub, role: payload.role };
    } catch {
      throw new UnauthorizedError('INVALID_TOKEN', 'Token inválido ou expirado.');
    }
  }
}

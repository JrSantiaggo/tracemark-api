import type { FastifyRequest } from 'fastify';
import { createHash, timingSafeEqual } from 'node:crypto';
import type { TokenService } from '../application/ports/token-service.js';
import type { Actor } from '../domain/actor.js';
import { ForbiddenError, UnauthorizedError } from '../domain/errors.js';
import type { UserRole } from '../domain/user-role.js';

declare module 'fastify' {
  interface FastifyRequest {
    actor?: Actor;
  }
}

export type AuthGuards = ReturnType<typeof createAuthGuards>;

export function createAuthGuards(tokens: TokenService, internalApiToken: string) {
  const internalTokenDigest = sha256(internalApiToken);

  return {
    async authenticate(request: FastifyRequest): Promise<void> {
      const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
      if (scheme !== 'Bearer' || !token) {
        throw new UnauthorizedError('MISSING_TOKEN', 'Autenticação necessária.');
      }
      request.actor = tokens.verify(token);
    },

    requireRole(...roles: UserRole[]) {
      return async (request: FastifyRequest): Promise<void> => {
        if (!request.actor || !roles.includes(request.actor.role)) {
          throw new ForbiddenError('FORBIDDEN', 'Você não tem permissão para executar esta ação.');
        }
      };
    },

    async authenticateInternal(request: FastifyRequest): Promise<void> {
      const provided = request.headers['x-internal-token'];
      if (typeof provided !== 'string' || !timingSafeEqual(sha256(provided), internalTokenDigest)) {
        throw new UnauthorizedError('INVALID_INTERNAL_TOKEN', 'Credencial interna inválida.');
      }
    },
  };
}

export function getActor(request: FastifyRequest): Actor {
  if (!request.actor) throw new UnauthorizedError('MISSING_TOKEN', 'Autenticação necessária.');
  return request.actor;
}

function sha256(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

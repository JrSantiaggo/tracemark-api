import type { Actor } from '../../domain/actor.js';

export interface IssuedToken {
  accessToken: string;
  expiresInSeconds: number;
}

export interface TokenService {
  issue(actor: Actor): IssuedToken;
  verify(token: string): Actor;
}

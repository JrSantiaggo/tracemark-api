import { hash, verify } from '@node-rs/argon2';
import type { PasswordHasher } from '../../application/ports/password-hasher.js';

const ARGON2ID = 2;

export class Argon2PasswordHasher implements PasswordHasher {
  hash(plain: string): Promise<string> {
    return hash(plain, { algorithm: ARGON2ID, memoryCost: 19_456, timeCost: 2, parallelism: 1 });
  }

  async verify(hashed: string, plain: string): Promise<boolean> {
    try {
      return await verify(hashed, plain);
    } catch {
      return false;
    }
  }
}

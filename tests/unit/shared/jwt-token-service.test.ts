import { describe, expect, it } from 'vitest';
import { UnauthorizedError } from '../../../src/shared/domain/errors.js';
import { JwtTokenService } from '../../../src/shared/infrastructure/security/jwt-token-service.js';

const SECRET = 'unit-test-secret-with-at-least-32-characters';
const actor = { id: '5d1c0a7e-3b2f-4c8d-9e1a-7f6b5c4d3e2f', role: 'PHOTOGRAPHER' as const };

describe('JwtTokenService', () => {
  it('issues tokens that round-trip to the same actor', () => {
    const service = new JwtTokenService(SECRET, 60);
    const { accessToken, expiresInSeconds } = service.issue(actor);
    expect(expiresInSeconds).toBe(60);
    expect(service.verify(accessToken)).toEqual(actor);
  });

  it('rejects tokens signed with a different secret', () => {
    const token = new JwtTokenService(`${SECRET}-other`, 60).issue(actor).accessToken;
    expect(() => new JwtTokenService(SECRET, 60).verify(token)).toThrow(UnauthorizedError);
  });

  it('rejects tampered payloads', () => {
    const service = new JwtTokenService(SECRET, 60);
    const [header, , signature] = service.issue(actor).accessToken.split('.');
    const payload = Buffer.from(JSON.stringify({ sub: actor.id, role: 'USER', iss: 'tracemark-api' })).toString(
      'base64url',
    );
    expect(() => service.verify(`${header}.${payload}.${signature}`)).toThrow(UnauthorizedError);
  });

  it('rejects unsigned tokens (alg none)', () => {
    const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const token = `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ sub: actor.id, role: 'PHOTOGRAPHER' })}.`;
    expect(() => new JwtTokenService(SECRET, 60).verify(token)).toThrow(UnauthorizedError);
  });
});

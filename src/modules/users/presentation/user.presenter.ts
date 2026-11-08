import { z } from 'zod';
import { UserRole } from '../../../shared/domain/user-role.js';
import { isoDateTime } from '../../../shared/presentation/http-schemas.js';
import type { User } from '../domain/user.js';

export const userRoleSchema = z.enum([UserRole.PHOTOGRAPHER, UserRole.USER]);

export const publicUserSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    role: userRoleSchema,
    bio: z.string().nullable(),
    createdAt: isoDateTime,
  })
  .meta({ id: 'PublicUser' });

export const privateUserSchema = publicUserSchema
  .extend({ email: z.email() })
  .meta({ id: 'PrivateUser' });

export function presentPublicUser(user: User): z.infer<typeof publicUserSchema> {
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    bio: user.bio,
    createdAt: user.createdAt.toISOString(),
  };
}

export function presentPrivateUser(user: User): z.infer<typeof privateUserSchema> {
  return { ...presentPublicUser(user), email: user.email };
}

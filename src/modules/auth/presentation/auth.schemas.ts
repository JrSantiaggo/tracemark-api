import { z } from 'zod';
import { UserRole } from '../../../shared/domain/user-role.js';
import { bearerAuth, errorResponses } from '../../../shared/presentation/http-schemas.js';
import { privateUserSchema, userRoleSchema } from '../../users/presentation/user.presenter.js';

const authResponseSchema = z
  .object({
    accessToken: z.string(),
    tokenType: z.literal('Bearer'),
    expiresIn: z.number().int().describe('Validade do token em segundos'),
    user: privateUserSchema,
  })
  .meta({ id: 'AuthResponse' });

export const registerSchema = {
  tags: ['Auth'],
  summary: 'Cadastra um novo usuário',
  body: z.object({
    name: z.string().trim().min(2).max(120),
    email: z.email().max(254),
    password: z.string().min(8).max(128),
    role: userRoleSchema.default(UserRole.USER),
  }),
  response: { 201: authResponseSchema, ...errorResponses(400, 409, 429) },
};

export const loginSchema = {
  tags: ['Auth'],
  summary: 'Autentica um usuário e emite um JWT',
  body: z.object({
    email: z.email().max(254),
    password: z.string().min(1).max(128),
  }),
  response: { 200: authResponseSchema, ...errorResponses(400, 401, 429) },
};

export const meSchema = {
  tags: ['Auth'],
  summary: 'Retorna o usuário autenticado',
  security: bearerAuth,
  response: { 200: privateUserSchema, ...errorResponses(401) },
};

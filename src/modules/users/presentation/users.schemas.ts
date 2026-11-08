import { z } from 'zod';
import { bearerAuth, errorResponses, idParamSchema } from '../../../shared/presentation/http-schemas.js';
import { privateUserSchema, publicUserSchema } from './user.presenter.js';

export const getPublicProfileSchema = {
  tags: ['Users'],
  summary: 'Consulta o perfil público de um usuário',
  security: bearerAuth,
  params: idParamSchema,
  response: { 200: publicUserSchema, ...errorResponses(400, 401, 404) },
};

export const updateMyProfileSchema = {
  tags: ['Users'],
  summary: 'Atualiza o perfil do usuário autenticado',
  security: bearerAuth,
  body: z
    .object({
      name: z.string().trim().min(2).max(120).optional(),
      bio: z.string().trim().max(500).nullable().optional(),
    })
    .refine((body) => body.name !== undefined || body.bio !== undefined, {
      message: 'Informe ao menos um campo para atualizar.',
    }),
  response: { 200: privateUserSchema, ...errorResponses(400, 401) },
};

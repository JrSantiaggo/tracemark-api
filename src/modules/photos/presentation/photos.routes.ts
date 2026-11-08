import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { UserRole } from '../../../shared/domain/user-role.js';
import type { AuthGuards } from '../../../shared/presentation/auth-guards.js';
import type { PhotosController } from './photos.controller.js';
import {
  confirmUploadSchema,
  createPhotosSchema,
  getPhotoDetailsSchema,
  listMyPhotosSchema,
  processingResultSchema,
  renewUploadUrlSchema,
} from './photos.schemas.js';

export function photosRoutes(controller: PhotosController, guards: AuthGuards): FastifyPluginAsyncZod {
  return async (app) => {
    app.addHook('onRequest', guards.authenticate);
    const photographerOnly = guards.requireRole(UserRole.PHOTOGRAPHER);

    app.post('/', { schema: createPhotosSchema, preHandler: photographerOnly }, controller.create);
    app.get('/me', { schema: listMyPhotosSchema, preHandler: photographerOnly }, controller.listMine);
    app.post(
      '/:id/upload-url',
      { schema: renewUploadUrlSchema, preHandler: photographerOnly },
      controller.renewUploadUrl,
    );
    app.post(
      '/:id/confirm-upload',
      { schema: confirmUploadSchema, preHandler: photographerOnly },
      controller.confirmUpload,
    );
    app.get('/:id', { schema: getPhotoDetailsSchema }, controller.getDetails);
  };
}

export function internalPhotosRoutes(controller: PhotosController, guards: AuthGuards): FastifyPluginAsyncZod {
  return async (app) => {
    app.addHook('onRequest', guards.authenticateInternal);

    app.patch('/:id/processing-result', { schema: processingResultSchema }, controller.applyProcessingResult);
  };
}

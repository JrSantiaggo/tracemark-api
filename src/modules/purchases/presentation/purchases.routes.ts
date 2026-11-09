import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { AuthGuards } from '../../../shared/presentation/auth-guards.js';
import type { PurchasesController } from './purchases.controller.js';
import { downloadOriginalSchema, listMyPurchasesSchema, purchasePhotoSchema } from './purchases.schemas.js';

export function purchasesRoutes(controller: PurchasesController, guards: AuthGuards): FastifyPluginAsyncZod {
  return async (app) => {
    app.addHook('onRequest', guards.authenticate);

    app.post('/photos/:id/purchase', { schema: purchasePhotoSchema }, controller.purchase);
    app.get('/photos/:id/download', { schema: downloadOriginalSchema }, controller.download);
    app.get('/purchases/me', { schema: listMyPurchasesSchema }, controller.listMine);
  };
}

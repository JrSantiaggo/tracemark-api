import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { DatabaseHealthCheck } from '../infrastructure/database/database-health-check.js';

const healthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  database: z.enum(['up', 'down']),
  uptimeSeconds: z.number(),
});

export function healthRoutes(database: DatabaseHealthCheck): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(
      '/health',
      {
        schema: {
          tags: ['Health'],
          summary: 'Verifica a saúde da API e a conexão com o banco',
          response: { 200: healthResponseSchema, 503: healthResponseSchema },
        },
      },
      async (_request, reply) => {
        const databaseUp = await database.isHealthy();
        return reply.status(databaseUp ? 200 : 503).send({
          status: databaseUp ? 'ok' : 'degraded',
          database: databaseUp ? 'up' : 'down',
          uptimeSeconds: Math.round(process.uptime()),
        });
      },
    );
  };
}

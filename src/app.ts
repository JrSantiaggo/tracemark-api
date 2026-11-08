import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import {
  jsonSchemaTransform,
  jsonSchemaTransformObject,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import type { Env } from './config/env.js';
import { createContainer } from './container.js';
import { authRoutes } from './modules/auth/presentation/auth.routes.js';
import { commentsRoutes } from './modules/comments/presentation/comments.routes.js';
import { feedRoutes } from './modules/feed/presentation/feed.routes.js';
import { notificationsRoutes } from './modules/notifications/presentation/notifications.routes.js';
import { internalPhotosRoutes, photosRoutes } from './modules/photos/presentation/photos.routes.js';
import { usersRoutes } from './modules/users/presentation/users.routes.js';
import type { PasswordHasher } from './shared/application/ports/password-hasher.js';
import type { StorageGateway } from './shared/application/ports/storage-gateway.js';
import { createPrismaClient, type PrismaClient } from './shared/infrastructure/database/prisma-client.js';
import { S3StorageGateway } from './shared/infrastructure/storage/s3-storage-gateway.js';
import { errorHandler, notFoundHandler } from './shared/presentation/error-handler.js';
import { healthRoutes } from './shared/presentation/health.routes.js';

export interface BuildAppOptions {
  env: Env;
  prisma?: PrismaClient;
  storage?: StorageGateway;
  passwordHasher?: PasswordHasher;
}

export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const { env } = options;

  const app = Fastify({
    logger: buildLoggerOptions(env),
    trustProxy: env.TRUST_PROXY,
    bodyLimit: 256 * 1024,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.setErrorHandler(errorHandler);
  app.setNotFoundHandler(notFoundHandler);

  const prisma = options.prisma ?? createPrismaClient(env.DATABASE_URL);
  if (!options.prisma) app.addHook('onClose', () => prisma.$disconnect());

  const storage =
    options.storage ??
    new S3StorageGateway({
      region: env.AWS_REGION,
      bucket: env.S3_BUCKET,
      endpoint: env.S3_ENDPOINT,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
    });

  const { controllers, guards, databaseHealth } = createContainer({
    env,
    prisma,
    storage,
    ...(options.passwordHasher ? { passwordHasher: options.passwordHasher } : {}),
  });

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: env.CORS_ORIGINS.length > 0 ? env.CORS_ORIGINS : false,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  await app.register(rateLimit, { global: false });

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'TraceMark API',
        description: 'API principal da plataforma TraceMark de fotografias de corridas de rua.',
        version: '0.1.0',
      },
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
          internalToken: { type: 'apiKey', in: 'header', name: 'x-internal-token' },
        },
      },
    },
    transform: jsonSchemaTransform,
    transformObject: jsonSchemaTransformObject,
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });

  await app.register(healthRoutes(databaseHealth));
  await app.register(authRoutes(controllers.auth, guards, env.AUTH_RATE_LIMIT_MAX), { prefix: '/auth' });
  await app.register(usersRoutes(controllers.users, guards), { prefix: '/users' });
  await app.register(photosRoutes(controllers.photos, guards), { prefix: '/photos' });
  await app.register(feedRoutes(controllers.feed, guards), { prefix: '/feed' });
  await app.register(commentsRoutes(controllers.comments, guards));
  await app.register(notificationsRoutes(controllers.notifications, guards), { prefix: '/notifications' });
  await app.register(internalPhotosRoutes(controllers.photos, guards), { prefix: '/internal/photos' });

  return app;
}

function buildLoggerOptions(env: Env): FastifyServerOptions['logger'] {
  if (env.NODE_ENV === 'test') return false;
  return {
    level: env.LOG_LEVEL,
    redact: {
      paths: ['req.headers.authorization', 'req.headers["x-internal-token"]', 'req.headers.cookie'],
      censor: '[REDACTED]',
    },
    ...(env.NODE_ENV === 'development' ? { transport: { target: 'pino-pretty' } } : {}),
  };
}

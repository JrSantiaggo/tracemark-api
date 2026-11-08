import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import {
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError,
} from 'fastify-type-provider-zod';
import { AppError, type ErrorKind } from '../domain/errors.js';

const STATUS_BY_KIND: Record<ErrorKind, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
};

export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  if (error instanceof AppError) {
    return reply
      .status(STATUS_BY_KIND[error.kind])
      .send({ error: { code: error.code, message: error.message } });
  }

  if (hasZodFastifySchemaValidationErrors(error)) {
    return reply.status(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Os dados enviados são inválidos.',
        details: error.validation.map((issue) => ({
          location: error.validationContext ?? 'request',
          path: issue.instancePath,
          message: issue.message ?? 'Valor inválido.',
        })),
      },
    });
  }

  if (isResponseSerializationError(error)) {
    request.log.error({ err: error, issues: error.cause.issues }, 'response serialization failed');
    return sendInternalError(reply);
  }

  const status = error.statusCode ?? 500;
  if (status >= 400 && status < 500) {
    return reply.status(status).send({ error: { code: error.code ?? 'BAD_REQUEST', message: error.message } });
  }

  request.log.error({ err: error }, 'unhandled error');
  return sendInternalError(reply);
}

export function notFoundHandler(request: FastifyRequest, reply: FastifyReply) {
  return reply
    .status(404)
    .send({ error: { code: 'ROUTE_NOT_FOUND', message: `Rota ${request.method} ${request.url} não encontrada.` } });
}

function sendInternalError(reply: FastifyReply) {
  return reply.status(500).send({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Erro interno do servidor.' } });
}

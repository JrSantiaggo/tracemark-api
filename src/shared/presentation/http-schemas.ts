import { z } from 'zod';

export const errorResponseSchema = z
  .object({
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z
        .array(z.object({ location: z.string(), path: z.string(), message: z.string() }))
        .optional(),
    }),
  })
  .meta({ id: 'ErrorResponse' });

export function errorResponses<const Codes extends readonly number[]>(...codes: Codes) {
  return Object.fromEntries(codes.map((code) => [code, errorResponseSchema])) as {
    [K in Codes[number]]: typeof errorResponseSchema;
  };
}

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().min(1).max(512).optional(),
});

export const idParamSchema = z.object({ id: z.uuid() });

export const userSummarySchema = z.object({ id: z.uuid(), name: z.string() });

export const isoDateTime = z.iso.datetime();

export function pageResponseSchema<T extends z.ZodType>(item: T) {
  return z.object({ data: z.array(item), nextCursor: z.string().nullable() });
}

export const bearerAuth = [{ bearerAuth: [] }];

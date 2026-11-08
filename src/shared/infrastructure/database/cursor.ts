import { z } from 'zod';
import { BadRequestError } from '../../domain/errors.js';

export class InvalidCursorError extends BadRequestError {
  constructor() {
    super('INVALID_CURSOR', 'Cursor de paginação inválido.');
  }
}

export const timestampCursorSchema = z.object({ t: z.iso.datetime(), id: z.uuid() });
export type TimestampCursor = { t: Date; id: string };

export function encodeTimestampCursor(timestamp: Date, id: string): string {
  return Buffer.from(JSON.stringify({ t: timestamp.toISOString(), id })).toString('base64url');
}

export function decodeTimestampCursor(cursor: string | undefined): TimestampCursor | undefined {
  if (!cursor) return undefined;
  try {
    const parsed = timestampCursorSchema.parse(JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')));
    return { t: new Date(parsed.t), id: parsed.id };
  } catch {
    throw new InvalidCursorError();
  }
}

export function buildPage<Row, Item>(
  rows: Row[],
  limit: number,
  toItem: (row: Row) => Item,
  cursorOf: (row: Row) => string,
): { items: Item[]; nextCursor: string | null } {
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const last = pageRows.at(-1);
  return {
    items: pageRows.map(toItem),
    nextCursor: hasMore && last ? cursorOf(last) : null,
  };
}

import { describe, expect, it } from 'vitest';
import {
  buildPage,
  decodeTimestampCursor,
  encodeTimestampCursor,
  InvalidCursorError,
} from '../../../src/shared/infrastructure/database/cursor.js';

describe('timestamp cursor', () => {
  it('round-trips date and id', () => {
    const date = new Date('2026-11-08T12:34:56.789Z');
    const id = '5d1c0a7e-3b2f-4c8d-9e1a-7f6b5c4d3e2f';
    expect(decodeTimestampCursor(encodeTimestampCursor(date, id))).toEqual({ t: date, id });
  });

  it.each(['garbage', Buffer.from('{"t":"x","id":"y"}').toString('base64url')])('rejects %s', (cursor) => {
    expect(() => decodeTimestampCursor(cursor)).toThrow(InvalidCursorError);
  });

  it('builds pages with a next cursor only when more rows exist', () => {
    const rows = [1, 2, 3];
    expect(buildPage(rows, 2, (n) => n, String)).toEqual({ items: [1, 2], nextCursor: '2' });
    expect(buildPage(rows, 3, (n) => n, String)).toEqual({ items: [1, 2, 3], nextCursor: null });
  });
});

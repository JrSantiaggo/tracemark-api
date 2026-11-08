import { describe, expect, it } from 'vitest';
import { resolveImageExtension } from '../../../src/modules/photos/domain/image-format.js';
import { FileExtensionMismatchError, UnsupportedImageTypeError } from '../../../src/modules/photos/domain/photo.errors.js';

describe('resolveImageExtension', () => {
  it.each([
    ['image/jpeg', 'foto.jpg', 'jpg'],
    ['image/jpeg', 'FOTO.JPEG', 'jpg'],
    ['image/png', 'a.b.png', 'png'],
    ['image/webp', 'x.webp', 'webp'],
  ])('%s + %s → %s', (mime, file, expected) => {
    expect(resolveImageExtension(mime, file)).toBe(expected);
  });

  it('rejects unsupported MIME types', () => {
    expect(() => resolveImageExtension('image/gif', 'a.gif')).toThrow(UnsupportedImageTypeError);
    expect(() => resolveImageExtension('application/pdf', 'a.jpg')).toThrow(UnsupportedImageTypeError);
  });

  it.each(['a.png', 'jpg', 'a.jpg.exe', 'a.'])('rejects mismatching file name %s', (file) => {
    expect(() => resolveImageExtension('image/jpeg', file)).toThrow(FileExtensionMismatchError);
  });
});

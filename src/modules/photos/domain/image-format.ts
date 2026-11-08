import { FileExtensionMismatchError, UnsupportedImageTypeError } from './photo.errors.js';

const EXTENSIONS_BY_MIME_TYPE = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
} as const satisfies Record<string, readonly [string, ...string[]]>;

export type SupportedMimeType = keyof typeof EXTENSIONS_BY_MIME_TYPE;

export const SUPPORTED_MIME_TYPES = Object.keys(EXTENSIONS_BY_MIME_TYPE) as SupportedMimeType[];

function isSupportedMimeType(mimeType: string): mimeType is SupportedMimeType {
  return mimeType in EXTENSIONS_BY_MIME_TYPE;
}

export function resolveImageExtension(mimeType: string, fileName: string): string {
  const normalizedMime = mimeType.toLowerCase();
  if (!isSupportedMimeType(normalizedMime)) throw new UnsupportedImageTypeError();

  const allowed: readonly string[] = EXTENSIONS_BY_MIME_TYPE[normalizedMime];
  const extension = fileName.toLowerCase().split('.').pop();
  if (!extension || extension === fileName.toLowerCase() || !allowed.includes(extension)) {
    throw new FileExtensionMismatchError();
  }

  return EXTENSIONS_BY_MIME_TYPE[normalizedMime][0];
}

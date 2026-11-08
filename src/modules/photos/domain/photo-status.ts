export const PhotoStatus = {
  UPLOADING: 'UPLOADING',
  PROCESSING: 'PROCESSING',
  PUBLISHABLE: 'PUBLISHABLE',
  ERROR: 'ERROR',
} as const;

export type PhotoStatus = (typeof PhotoStatus)[keyof typeof PhotoStatus];

export const ALLOWED_TRANSITIONS: Record<PhotoStatus, readonly PhotoStatus[]> = {
  UPLOADING: [PhotoStatus.PROCESSING, PhotoStatus.ERROR],
  PROCESSING: [PhotoStatus.PUBLISHABLE, PhotoStatus.ERROR],
  PUBLISHABLE: [],
  ERROR: [],
};

export const PhotoFailureReason = {
  UPLOAD_EXPIRED: 'UPLOAD_EXPIRED',
  INVALID_UPLOAD: 'INVALID_UPLOAD',
} as const;

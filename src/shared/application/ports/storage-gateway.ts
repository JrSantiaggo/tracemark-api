export interface PresignedUpload {
  url: string;
  fields: Record<string, string>;
  expiresAt: Date;
}

export interface StoredObjectMetadata {
  sizeBytes: number;
  contentType: string | null;
}

export interface SignedDownloadUrl {
  url: string;
  expiresAt: Date;
}

export interface CreatePresignedUploadInput {
  key: string;
  contentType: string;
  sizeBytes: number;
  expiresInSeconds: number;
}

export interface DownloadUrlOptions {
  attachmentFileName?: string;
}

export interface StorageGateway {
  createPresignedUpload(input: CreatePresignedUploadInput): Promise<PresignedUpload>;
  getObjectMetadata(key: string): Promise<StoredObjectMetadata | null>;
  createDownloadUrl(key: string, expiresInSeconds: number, options?: DownloadUrlOptions): Promise<SignedDownloadUrl>;
}

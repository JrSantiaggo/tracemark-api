import type {
  CreatePresignedUploadInput,
  DownloadUrlOptions,
  PresignedUpload,
  SignedDownloadUrl,
  StorageGateway,
  StoredObjectMetadata,
} from '../../src/shared/application/ports/storage-gateway.js';

export const FAKE_STORAGE_URL = 'https://fake-storage.local/tracemark-test';

export class FakeStorageGateway implements StorageGateway {
  readonly objects = new Map<string, StoredObjectMetadata>();
  readonly presignedUploads: CreatePresignedUploadInput[] = [];

  async createPresignedUpload(input: CreatePresignedUploadInput): Promise<PresignedUpload> {
    this.presignedUploads.push(input);
    return {
      url: FAKE_STORAGE_URL,
      fields: { key: input.key, 'Content-Type': input.contentType, Policy: 'fake-policy' },
      expiresAt: new Date(Date.now() + input.expiresInSeconds * 1000),
    };
  }

  async getObjectMetadata(key: string): Promise<StoredObjectMetadata | null> {
    return this.objects.get(key) ?? null;
  }

  async createDownloadUrl(
    key: string,
    expiresInSeconds: number,
    options: DownloadUrlOptions = {},
  ): Promise<SignedDownloadUrl> {
    const attachment = options.attachmentFileName
      ? `&attachment=${encodeURIComponent(options.attachmentFileName)}`
      : '';
    return {
      url: `${FAKE_STORAGE_URL}/${key}?signature=fake${attachment}`,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
    };
  }

  simulateUpload(key: string, sizeBytes: number, contentType: string): void {
    this.objects.set(key, { sizeBytes, contentType });
  }

  reset(): void {
    this.objects.clear();
    this.presignedUploads.length = 0;
  }
}

import { InvalidPhotoStatusTransitionError, InvalidWatermarkedKeyError } from './photo.errors.js';
import { ALLOWED_TRANSITIONS, PhotoFailureReason, PhotoStatus } from './photo-status.js';
import { PhotoStorageKeys } from './photo-storage-keys.js';

export interface PhotoProps {
  id: string;
  photographerId: string;
  title: string;
  description: string | null;
  eventName: string | null;
  takenAt: Date | null;
  /** Decimal string with two fractional digits, e.g. "49.90". */
  price: string;
  originalKey: string;
  watermarkedKey: string | null;
  status: PhotoStatus;
  mimeType: string;
  fileSize: number;
  processingError: string | null;
  uploadExpiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
}

export interface NewPhotoInput {
  id: string;
  photographerId: string;
  title: string;
  description: string | null;
  eventName: string | null;
  takenAt: Date | null;
  price: string;
  originalKey: string;
  mimeType: string;
  fileSize: number;
  uploadExpiresAt: Date;
  now: Date;
}

export class Photo {
  private constructor(private props: PhotoProps) {}

  static createPending(input: NewPhotoInput): Photo {
    const { now, ...rest } = input;
    return new Photo({
      ...rest,
      watermarkedKey: null,
      status: PhotoStatus.UPLOADING,
      processingError: null,
      createdAt: now,
      updatedAt: now,
      publishedAt: null,
    });
  }

  static restore(props: PhotoProps): Photo {
    return new Photo({ ...props });
  }

  get id(): string {
    return this.props.id;
  }

  get photographerId(): string {
    return this.props.photographerId;
  }

  get status(): PhotoStatus {
    return this.props.status;
  }

  get originalKey(): string {
    return this.props.originalKey;
  }

  get watermarkedKey(): string | null {
    return this.props.watermarkedKey;
  }

  get mimeType(): string {
    return this.props.mimeType;
  }

  get fileSize(): number {
    return this.props.fileSize;
  }

  get title(): string {
    return this.props.title;
  }

  toSnapshot(): Readonly<PhotoProps> {
    return { ...this.props };
  }

  isOwnedBy(userId: string): boolean {
    return this.props.photographerId === userId;
  }

  isPublishable(): boolean {
    return this.props.status === PhotoStatus.PUBLISHABLE;
  }

  isVisibleTo(userId: string): boolean {
    return this.isOwnedBy(userId) || this.isPublishable();
  }

  hasOriginalInStorage(): boolean {
    if (this.props.status === PhotoStatus.UPLOADING) return false;
    return this.props.processingError !== PhotoFailureReason.UPLOAD_EXPIRED;
  }

  renewUploadWindow(expiresAt: Date): void {
    if (this.props.status !== PhotoStatus.UPLOADING) {
      throw new InvalidPhotoStatusTransitionError(this.props.status, PhotoStatus.UPLOADING);
    }
    this.props.uploadExpiresAt = expiresAt;
  }

  markUploadReceived(): void {
    this.transitionTo(PhotoStatus.PROCESSING);
  }

  publish(watermarkedKey: string, now: Date): void {
    if (!PhotoStorageKeys.isValidWatermarkedKey(this.props.id, watermarkedKey)) {
      throw new InvalidWatermarkedKeyError();
    }
    this.transitionTo(PhotoStatus.PUBLISHABLE);
    this.props.watermarkedKey = watermarkedKey;
    this.props.publishedAt = now;
    this.props.processingError = null;
  }

  fail(reason: string): void {
    this.transitionTo(PhotoStatus.ERROR);
    this.props.processingError = reason.slice(0, 500);
  }

  private transitionTo(next: PhotoStatus): void {
    if (!ALLOWED_TRANSITIONS[this.props.status].includes(next)) {
      throw new InvalidPhotoStatusTransitionError(this.props.status, next);
    }
    this.props.status = next;
  }
}

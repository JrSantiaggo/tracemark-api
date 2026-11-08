import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnprocessableError,
} from '../../../shared/domain/errors.js';
import type { PhotoStatus } from './photo-status.js';

export class PhotoNotFoundError extends NotFoundError {
  constructor() {
    super('PHOTO_NOT_FOUND', 'Fotografia não encontrada.');
  }
}

export class InvalidPhotoStatusTransitionError extends ConflictError {
  constructor(from: PhotoStatus, to: PhotoStatus) {
    super('INVALID_STATUS_TRANSITION', `Transição de estado inválida: ${from} -> ${to}.`);
  }
}

export class PhotoStateChangedError extends ConflictError {
  constructor() {
    super('PHOTO_STATE_CHANGED', 'A fotografia foi alterada por outra operação. Tente novamente.');
  }
}

export class UnsupportedImageTypeError extends BadRequestError {
  constructor() {
    super('UNSUPPORTED_IMAGE_TYPE', 'Formato de imagem não suportado. Use JPEG, PNG ou WEBP.');
  }
}

export class FileExtensionMismatchError extends BadRequestError {
  constructor() {
    super('FILE_EXTENSION_MISMATCH', 'A extensão do arquivo não corresponde ao tipo MIME informado.');
  }
}

export class TooManyPhotosError extends BadRequestError {
  constructor(maxPhotos: number) {
    super('TOO_MANY_PHOTOS', `É possível enviar no máximo ${maxPhotos} fotografias por vez.`);
  }
}

export class FileTooLargeError extends BadRequestError {
  constructor(maxSizeBytes: number) {
    super('FILE_TOO_LARGE', `O arquivo excede o tamanho máximo de ${maxSizeBytes} bytes.`);
  }
}

export class UploadNotFoundError extends UnprocessableError {
  constructor() {
    super('UPLOAD_NOT_FOUND', 'O arquivo ainda não foi enviado ao armazenamento.');
  }
}

export class UploadMismatchError extends UnprocessableError {
  constructor() {
    super('UPLOAD_MISMATCH', 'O arquivo enviado não corresponde aos metadados declarados.');
  }
}

export class InvalidWatermarkedKeyError extends BadRequestError {
  constructor() {
    super('INVALID_WATERMARKED_KEY', 'A chave da imagem processada não pertence a esta fotografia.');
  }
}

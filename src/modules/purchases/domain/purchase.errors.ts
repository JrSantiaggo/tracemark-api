import {
  ConflictError,
  ForbiddenError,
  UnprocessableError,
} from '../../../shared/domain/errors.js';

export class CannotPurchaseOwnPhotoError extends UnprocessableError {
  constructor() {
    super('CANNOT_PURCHASE_OWN_PHOTO', 'Você não pode comprar a própria fotografia.');
  }
}

export class PhotoAlreadyPurchasedError extends ConflictError {
  constructor() {
    super('PHOTO_ALREADY_PURCHASED', 'Você já comprou esta fotografia.');
  }
}

export class PurchaseRequiredError extends ForbiddenError {
  constructor() {
    super('PURCHASE_REQUIRED', 'Compre a fotografia para baixar a versão original.');
  }
}

export class OriginalNotAvailableError extends ConflictError {
  constructor() {
    super('ORIGINAL_NOT_AVAILABLE', 'A versão original desta fotografia não está disponível.');
  }
}

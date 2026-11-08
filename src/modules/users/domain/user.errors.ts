import { ConflictError, NotFoundError } from '../../../shared/domain/errors.js';

export class EmailAlreadyInUseError extends ConflictError {
  constructor() {
    super('EMAIL_ALREADY_IN_USE', 'Este e-mail já está cadastrado.');
  }
}

export class UserNotFoundError extends NotFoundError {
  constructor() {
    super('USER_NOT_FOUND', 'Usuário não encontrado.');
  }
}

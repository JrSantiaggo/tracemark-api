import { UnauthorizedError } from '../../../shared/domain/errors.js';

export class InvalidCredentialsError extends UnauthorizedError {
  constructor() {
    super('INVALID_CREDENTIALS', 'E-mail ou senha inválidos.');
  }
}

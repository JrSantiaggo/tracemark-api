export type ErrorKind =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'UNPROCESSABLE';

export abstract class AppError extends Error {
  abstract readonly kind: ErrorKind;

  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class BadRequestError extends AppError {
  readonly kind = 'BAD_REQUEST';
}

export class UnauthorizedError extends AppError {
  readonly kind = 'UNAUTHORIZED';
}

export class ForbiddenError extends AppError {
  readonly kind = 'FORBIDDEN';
}

export class NotFoundError extends AppError {
  readonly kind = 'NOT_FOUND';
}

export class ConflictError extends AppError {
  readonly kind = 'CONFLICT';
}

export class UnprocessableError extends AppError {
  readonly kind = 'UNPROCESSABLE';
}

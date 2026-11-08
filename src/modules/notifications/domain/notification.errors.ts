import { NotFoundError } from '../../../shared/domain/errors.js';

export class NotificationNotFoundError extends NotFoundError {
  constructor() {
    super('NOTIFICATION_NOT_FOUND', 'Notificação não encontrada.');
  }
}

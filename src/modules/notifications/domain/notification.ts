export const NotificationType = {
  PHOTO_PUBLISHED: 'PHOTO_PUBLISHED',
  PHOTO_PROCESSING_FAILED: 'PHOTO_PROCESSING_FAILED',
  NEW_COMMENT: 'NEW_COMMENT',
} as const;

export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export interface Notification {
  id: string;
  userId: string;
  photoId: string | null;
  type: NotificationType;
  title: string;
  message: string;
  readAt: Date | null;
  createdAt: Date;
}

export type NewNotification = Pick<Notification, 'userId' | 'photoId' | 'type' | 'title' | 'message'>;

export const NotificationFactory = {
  photoPublished(photo: { id: string; photographerId: string; title: string }): NewNotification {
    return {
      userId: photo.photographerId,
      photoId: photo.id,
      type: NotificationType.PHOTO_PUBLISHED,
      title: 'Fotografia publicada',
      message: `Sua fotografia "${photo.title}" foi processada e já está disponível no mural.`,
    };
  },

  photoProcessingFailed(photo: { id: string; photographerId: string; title: string }): NewNotification {
    return {
      userId: photo.photographerId,
      photoId: photo.id,
      type: NotificationType.PHOTO_PROCESSING_FAILED,
      title: 'Falha no processamento',
      message: `Não foi possível processar a fotografia "${photo.title}". Envie-a novamente.`,
    };
  },

  newComment(
    photo: { id: string; photographerId: string; title: string },
    authorName: string,
  ): NewNotification {
    return {
      userId: photo.photographerId,
      photoId: photo.id,
      type: NotificationType.NEW_COMMENT,
      title: 'Novo comentário',
      message: `${authorName} comentou na sua fotografia "${photo.title}".`,
    };
  },
};

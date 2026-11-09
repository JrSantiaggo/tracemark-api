import type { Env } from './config/env.js';
import { GetAuthenticatedUserUseCase } from './modules/auth/application/use-cases/get-authenticated-user.use-case.js';
import { LoginUseCase } from './modules/auth/application/use-cases/login.use-case.js';
import { RegisterUseCase } from './modules/auth/application/use-cases/register.use-case.js';
import { AuthController } from './modules/auth/presentation/auth.controller.js';
import { CreateCommentUseCase } from './modules/comments/application/use-cases/create-comment.use-case.js';
import { DeleteCommentUseCase } from './modules/comments/application/use-cases/delete-comment.use-case.js';
import { ListPhotoCommentsUseCase } from './modules/comments/application/use-cases/list-photo-comments.use-case.js';
import { PrismaCommentRepository } from './modules/comments/infrastructure/prisma-comment.repository.js';
import { CommentsController } from './modules/comments/presentation/comments.controller.js';
import { ListFeedUseCase } from './modules/feed/application/use-cases/list-feed.use-case.js';
import { FeedController } from './modules/feed/presentation/feed.controller.js';
import { ListNotificationsUseCase } from './modules/notifications/application/use-cases/list-notifications.use-case.js';
import { MarkAllNotificationsAsReadUseCase } from './modules/notifications/application/use-cases/mark-all-notifications-as-read.use-case.js';
import { MarkNotificationAsReadUseCase } from './modules/notifications/application/use-cases/mark-notification-as-read.use-case.js';
import { PrismaNotificationRepository } from './modules/notifications/infrastructure/prisma-notification.repository.js';
import { NotificationsController } from './modules/notifications/presentation/notifications.controller.js';
import { PhotoImageUrlResolver } from './modules/photos/application/photo-image-url-resolver.js';
import { ApplyProcessingResultUseCase } from './modules/photos/application/use-cases/apply-processing-result.use-case.js';
import { ConfirmUploadUseCase } from './modules/photos/application/use-cases/confirm-upload.use-case.js';
import { CreatePhotosUseCase } from './modules/photos/application/use-cases/create-photos.use-case.js';
import { ExpireStaleUploadsUseCase } from './modules/photos/application/use-cases/expire-stale-uploads.use-case.js';
import { GetPhotoDetailsUseCase } from './modules/photos/application/use-cases/get-photo-details.use-case.js';
import { ListMyPhotosUseCase } from './modules/photos/application/use-cases/list-my-photos.use-case.js';
import { RenewUploadUrlUseCase } from './modules/photos/application/use-cases/renew-upload-url.use-case.js';
import { PrismaPhotoRepository } from './modules/photos/infrastructure/prisma-photo.repository.js';
import { PhotosController } from './modules/photos/presentation/photos.controller.js';
import { GetOriginalDownloadUseCase } from './modules/purchases/application/use-cases/get-original-download.use-case.js';
import { ListMyPurchasesUseCase } from './modules/purchases/application/use-cases/list-my-purchases.use-case.js';
import { PurchasePhotoUseCase } from './modules/purchases/application/use-cases/purchase-photo.use-case.js';
import { PrismaPurchaseRepository } from './modules/purchases/infrastructure/prisma-purchase.repository.js';
import { PurchasesController } from './modules/purchases/presentation/purchases.controller.js';
import { GetPublicProfileUseCase } from './modules/users/application/use-cases/get-public-profile.use-case.js';
import { UpdateMyProfileUseCase } from './modules/users/application/use-cases/update-my-profile.use-case.js';
import { PrismaUserRepository } from './modules/users/infrastructure/prisma-user.repository.js';
import { UsersController } from './modules/users/presentation/users.controller.js';
import type { PasswordHasher } from './shared/application/ports/password-hasher.js';
import type { StorageGateway } from './shared/application/ports/storage-gateway.js';
import { DatabaseHealthCheck } from './shared/infrastructure/database/database-health-check.js';
import type { PrismaClient } from './shared/infrastructure/database/prisma-client.js';
import { PrismaUnitOfWork } from './shared/infrastructure/database/prisma-unit-of-work.js';
import { Argon2PasswordHasher } from './shared/infrastructure/security/argon2-password-hasher.js';
import { JwtTokenService } from './shared/infrastructure/security/jwt-token-service.js';
import { createAuthGuards } from './shared/presentation/auth-guards.js';

const COMMENTS_PAGE_SIZE_IN_DETAILS = 20;

export interface ContainerDependencies {
  env: Env;
  prisma: PrismaClient;
  storage: StorageGateway;
  passwordHasher?: PasswordHasher;
}

export type Container = ReturnType<typeof createContainer>;

export function createContainer({ env, prisma, storage, passwordHasher }: ContainerDependencies) {
  const users = new PrismaUserRepository(prisma);
  const photos = new PrismaPhotoRepository(prisma);
  const comments = new PrismaCommentRepository(prisma);
  const notifications = new PrismaNotificationRepository(prisma);
  const purchases = new PrismaPurchaseRepository(prisma);
  const unitOfWork = new PrismaUnitOfWork(prisma);

  const hasher = passwordHasher ?? new Argon2PasswordHasher();
  const tokens = new JwtTokenService(env.JWT_SECRET, env.JWT_EXPIRES_IN_SECONDS);
  const images = new PhotoImageUrlResolver(storage, env.DOWNLOAD_URL_TTL_SECONDS);

  return {
    guards: createAuthGuards(tokens, env.INTERNAL_API_TOKEN),
    databaseHealth: new DatabaseHealthCheck(prisma),

    controllers: {
      auth: new AuthController({
        register: new RegisterUseCase(users, hasher, tokens),
        login: new LoginUseCase(users, hasher, tokens),
        getAuthenticatedUser: new GetAuthenticatedUserUseCase(users),
      }),
      users: new UsersController({
        getPublicProfile: new GetPublicProfileUseCase(users),
        updateMyProfile: new UpdateMyProfileUseCase(users),
      }),
      photos: new PhotosController({
        createPhotos: new CreatePhotosUseCase(photos, storage, {
          maxPhotosPerUpload: env.MAX_PHOTOS_PER_UPLOAD,
          maxUploadSizeBytes: env.MAX_UPLOAD_SIZE_BYTES,
          uploadUrlTtlSeconds: env.UPLOAD_URL_TTL_SECONDS,
        }),
        renewUploadUrl: new RenewUploadUrlUseCase(photos, storage, env.UPLOAD_URL_TTL_SECONDS),
        confirmUpload: new ConfirmUploadUseCase(photos, storage, images),
        listMyPhotos: new ListMyPhotosUseCase(photos, images),
        getPhotoDetails: new GetPhotoDetailsUseCase(photos, comments, purchases, images, COMMENTS_PAGE_SIZE_IN_DETAILS),
        applyProcessingResult: new ApplyProcessingResultUseCase(unitOfWork),
      }),
      feed: new FeedController(new ListFeedUseCase(photos, images)),
      comments: new CommentsController({
        createComment: new CreateCommentUseCase(unitOfWork),
        listPhotoComments: new ListPhotoCommentsUseCase(photos, comments),
        deleteComment: new DeleteCommentUseCase(photos, comments),
      }),
      purchases: new PurchasesController({
        purchasePhoto: new PurchasePhotoUseCase(unitOfWork),
        getOriginalDownload: new GetOriginalDownloadUseCase(
          photos,
          purchases,
          storage,
          env.ORIGINAL_DOWNLOAD_URL_TTL_SECONDS,
        ),
        listMyPurchases: new ListMyPurchasesUseCase(purchases, images),
      }),
      notifications: new NotificationsController({
        listNotifications: new ListNotificationsUseCase(notifications),
        markAsRead: new MarkNotificationAsReadUseCase(notifications),
        markAllAsRead: new MarkAllNotificationsAsReadUseCase(notifications),
      }),
    },

    jobs: {
      expireStaleUploads: new ExpireStaleUploadsUseCase(photos, env.STALE_UPLOAD_GRACE_MINUTES),
    },
  };
}

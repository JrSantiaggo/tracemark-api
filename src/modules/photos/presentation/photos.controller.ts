import { getActor } from '../../../shared/presentation/auth-guards.js';
import type { ZodReply, ZodRequest } from '../../../shared/presentation/route-types.js';
import { presentComment } from '../../comments/presentation/comment.presenter.js';
import type { ApplyProcessingResultUseCase } from '../application/use-cases/apply-processing-result.use-case.js';
import type { ConfirmUploadUseCase } from '../application/use-cases/confirm-upload.use-case.js';
import type { CreatePhotosUseCase } from '../application/use-cases/create-photos.use-case.js';
import type { GetPhotoDetailsUseCase } from '../application/use-cases/get-photo-details.use-case.js';
import type { ListMyPhotosUseCase } from '../application/use-cases/list-my-photos.use-case.js';
import type { RenewUploadUrlUseCase } from '../application/use-cases/renew-upload-url.use-case.js';
import { presentPhoto, presentPhotoBase, presentPhotoWithUpload } from './photo.presenter.js';
import type {
  confirmUploadSchema,
  createPhotosSchema,
  getPhotoDetailsSchema,
  listMyPhotosSchema,
  processingResultSchema,
  renewUploadUrlSchema,
} from './photos.schemas.js';

export class PhotosController {
  constructor(
    private readonly useCases: {
      createPhotos: CreatePhotosUseCase;
      renewUploadUrl: RenewUploadUrlUseCase;
      confirmUpload: ConfirmUploadUseCase;
      listMyPhotos: ListMyPhotosUseCase;
      getPhotoDetails: GetPhotoDetailsUseCase;
      applyProcessingResult: ApplyProcessingResultUseCase;
    },
  ) {}

  create = async (request: ZodRequest<typeof createPhotosSchema>, reply: ZodReply<typeof createPhotosSchema>) => {
    const created = await this.useCases.createPhotos.execute(getActor(request), request.body.photos);
    return reply
      .status(201)
      .send({ data: created.map(({ photo, upload }) => presentPhotoWithUpload(photo, upload)) });
  };

  renewUploadUrl = async (
    request: ZodRequest<typeof renewUploadUrlSchema>,
    reply: ZodReply<typeof renewUploadUrlSchema>,
  ) => {
    const { photo, upload } = await this.useCases.renewUploadUrl.execute(getActor(request), request.params.id);
    return reply.send(presentPhotoWithUpload(photo, upload));
  };

  confirmUpload = async (
    request: ZodRequest<typeof confirmUploadSchema>,
    reply: ZodReply<typeof confirmUploadSchema>,
  ) => {
    const view = await this.useCases.confirmUpload.execute(getActor(request), request.params.id);
    return reply.send(presentPhoto(view));
  };

  listMine = async (request: ZodRequest<typeof listMyPhotosSchema>, reply: ZodReply<typeof listMyPhotosSchema>) => {
    const { status, ...page } = request.query;
    const result = await this.useCases.listMyPhotos.execute(getActor(request), status, page);
    return reply.send({ data: result.items.map(presentPhoto), nextCursor: result.nextCursor });
  };

  getDetails = async (
    request: ZodRequest<typeof getPhotoDetailsSchema>,
    reply: ZodReply<typeof getPhotoDetailsSchema>,
  ) => {
    const details = await this.useCases.getPhotoDetails.execute(getActor(request), request.params.id);
    return reply.send({
      ...presentPhoto(details),
      purchasedAt: details.purchasedAt?.toISOString() ?? null,
      comments: { data: details.comments.items.map(presentComment), nextCursor: details.comments.nextCursor },
    });
  };

  applyProcessingResult = async (
    request: ZodRequest<typeof processingResultSchema>,
    reply: ZodReply<typeof processingResultSchema>,
  ) => {
    const photo = await this.useCases.applyProcessingResult.execute(request.params.id, request.body);
    return reply.send({ ...presentPhotoBase(photo), watermarkedKey: photo.watermarkedKey });
  };
}

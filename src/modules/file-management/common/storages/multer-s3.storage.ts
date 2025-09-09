import { StorageEngine } from "multer";
import { Request } from "express";
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  PayloadTooLargeException,
} from "@nestjs/common";
import { PassThrough } from "node:stream";
import { AwsS3Service } from "src/modules/aws/s3/aws-s3.service";
import { EContentType, EFileType } from "src/modules/file-management/common/enums";
import { FileManagementService } from "src/modules/file-management/services";
import { ELandingPart } from "src/modules/content-management/common/enums";
import { NUMBER_BYTES_IN_MEGABYTE, NUMBER_OF_PATH_PART_MODULE_INDEX } from "src/common/constants";
import { EChannelType } from "src/modules/chime-messaging-configuration/common/enums";
import { IFile } from "src/modules/file-management/common/interfaces";
import { EPromoCampaignBannerType } from "src/modules/promo-campaigns/common/enums";

@Injectable()
export class CustomStorageService implements StorageEngine {
  private readonly MEDIA_BUCKET_FILE_TYPES = [
    EFileType.CONTENT_MANAGEMENT,
    EFileType.UPLOAD_TERMS,
    EFileType.UI_LANGUAGES,
    EFileType.USER_AVATARS,
    EFileType.CHANNELS,
    EFileType.PROMO_CAMPAIGNS,
  ];

  constructor(
    private readonly awsS3Service: AwsS3Service,
    private readonly fileManagementService: FileManagementService,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  async _handleFile(
    req: Request,
    file: IFile,
    callback: (error?: Error | null, info?: { path: string }) => void,
  ): Promise<void> {
    try {
      const parts = req.path.split("/");
      const module = parts[NUMBER_OF_PATH_PART_MODULE_INDEX] as EFileType;

      const { fileSizeLimitMB, possibleContentTypes } = this.fileManagementService.getAllowedParams(module);

      if (!possibleContentTypes.includes(file.mimetype as EContentType)) {
        const allowedExtensions = possibleContentTypes
          .map((type) => this.fileManagementService.getFileExtension(type))
          .join(", ");

        return callback(
          new BadRequestException(
            `Invalid file format. Only files with the following extensions are allowed: ${allowedExtensions}`,
          ),
        );
      }

      if (Number(req.headers["content-length"]) > fileSizeLimitMB * NUMBER_BYTES_IN_MEGABYTE) {
        return callback(
          new PayloadTooLargeException(`File size is too large. Only '${fileSizeLimitMB}' MB less files are allowed`),
        );
      }

      const folder = this.fileManagementService.getFolderPath(module, req?.user?.role, {
        id: req?.query?.id as string,
        role: req?.query?.role as string,
        documentType: req?.query?.documentType as string,
        landingPart: req?.query?.landingPart as ELandingPart,
        channelType: req?.query?.channelType as EChannelType,
        promoBannerType: req?.query?.promoBannerType as EPromoCampaignBannerType,
      });

      const fileExtension = this.fileManagementService.getFileExtension(file.mimetype as EContentType);

      const pass = new PassThrough();
      const key = `${folder}/${new Date().getTime()}.${fileExtension}`;
      file.stream.pipe(pass);

      const isMediaBucket = this.MEDIA_BUCKET_FILE_TYPES.includes(module);
      await this.awsS3Service.uploadObject(key, pass, file.mimetype, isMediaBucket);

      file.key = key;
      callback(null, { path: key });
    } catch (err) {
      callback(new InternalServerErrorException((err as Error).message));
    }
  }

  _removeFile(_req: Request, _file: Express.Multer.File, callback: (error: Error | null) => void): void {
    callback(null);
  }
}

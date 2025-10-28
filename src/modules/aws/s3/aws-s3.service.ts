import {
  CompleteMultipartUploadCommandOutput,
  DeleteObjectCommand,
  DeleteObjectCommandOutput,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  ListObjectsV2CommandOutput,
  ObjectIdentifier,
  RestoreObjectCommand,
  S3Client,
  S3ClientConfig,
  Tier,
  CopyObjectCommand,
  CopyObjectCommandOutput,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  NUMBER_OF_SECONDS_IN_DAY,
  NUMBER_OF_SECONDS_IN_MINUTE,
  URL_EXPIRATION_DAYS,
  URL_EXPIRATION_MINUTES,
} from "src/common/constants";
import { LokiLogger } from "src/common/logger";
import { IAwsConfigS3 } from "src/modules/aws/s3/common/interfaces";
import { Readable } from "stream";
import { AwsConfigService } from "src/modules/aws/config/services";
import { EAwsS3ErrorCodes } from "src/modules/aws/s3/common/enums";

@Injectable()
export class AwsS3Service {
  private readonly lokiLogger = new LokiLogger(AwsS3Service.name);
  private readonly s3Client: S3Client;
  private readonly privateBucket: string;
  private readonly mediaBucket: string;
  private readonly region: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly awsConfigService: AwsConfigService,
  ) {
    const { credentials, region, s3BucketName, s3MediaBucketName } = this.configService.getOrThrow<IAwsConfigS3>("aws");
    this.region = region;
    this.privateBucket = s3BucketName;
    this.mediaBucket = s3MediaBucketName;
    this.s3Client = new S3Client(this.awsConfigService.getStandardClientConfig<S3ClientConfig>(region, credentials));
  }

  public async getAudioKeyInFolder(folderPath: string): Promise<ListObjectsV2CommandOutput> {
    try {
      const listCommand = new ListObjectsV2Command({
        Bucket: this.privateBucket,
        Prefix: folderPath,
      });
      const listResponse = await this.s3Client.send(listCommand);

      if (!listResponse.Contents || listResponse.Contents.length === 0) {
        this.lokiLogger.error(`No files found in the specified folder path: ${folderPath}.`);
        throw new NotFoundException(EAwsS3ErrorCodes.S3_FILES_NOT_FOUND);
      }

      return listResponse;
    } catch (error) {
      this.lokiLogger.error(`Error getting signed URL: ${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException(EAwsS3ErrorCodes.S3_GET_SIGNED_URL_FAILED);
    }
  }

  public async restoreObjectFromDeepArchive(key: string, days: number = 1): Promise<void> {
    try {
      const restoreCommand = new RestoreObjectCommand({
        Bucket: this.privateBucket,
        Key: key,
        RestoreRequest: {
          Days: days,
          GlacierJobParameters: {
            Tier: Tier.Bulk,
          },
        },
      });

      const response = await this.s3Client.send(restoreCommand);
      this.lokiLogger.log(`Restore request initiated for object ${key}. Response: ${JSON.stringify(response)}`);
    } catch (error) {
      this.lokiLogger.error(`Error restoring object ${key}: ${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException(EAwsS3ErrorCodes.S3_RESTORE_OBJECT_FAILED);
    }
  }

  public async getShortLivedSignedUrl(key: string): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.privateBucket,
        Key: key,
      });

      return await getSignedUrl(this.s3Client, command, {
        expiresIn: URL_EXPIRATION_MINUTES * NUMBER_OF_SECONDS_IN_MINUTE,
      });
    } catch (error) {
      this.lokiLogger.error(`Error getting signed URL:${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException(EAwsS3ErrorCodes.S3_GET_SIGNED_URL_FAILED);
    }
  }

  public async getMaxLivedSignedUrl(key: string): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.privateBucket,
        Key: key,
      });

      return await getSignedUrl(this.s3Client, command, {
        expiresIn: URL_EXPIRATION_DAYS * NUMBER_OF_SECONDS_IN_DAY,
      });
    } catch (error) {
      this.lokiLogger.error(`Error getting signed URL:${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException(EAwsS3ErrorCodes.S3_GET_SIGNED_URL_FAILED);
    }
  }

  public async uploadObject(
    key: string,
    body: ReadableStream | Readable,
    contentType: string,
    isMediaBucket: boolean = false,
  ): Promise<CompleteMultipartUploadCommandOutput> {
    try {
      const bucketName = this.getBucketName(isMediaBucket);
      const commandToUploadFile = new Upload({
        client: this.s3Client,
        params: {
          Bucket: bucketName,
          Key: key,
          Body: body,
          ContentType: contentType,
        },
      });

      return await commandToUploadFile.done();
    } catch (error) {
      this.lokiLogger.error(`Error uploading object:${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException(EAwsS3ErrorCodes.S3_UPLOAD_OBJECT_FAILED);
    }
  }

  public async getMediaListObjectKeys(prefix: string): Promise<string[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.mediaBucket,
        Prefix: prefix,
      });

      const data = await this.s3Client.send(command);

      return data.Contents?.map((item) => item.Key!) ?? [];
    } catch (error) {
      this.lokiLogger.error(`Error getting list of objects:${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException(EAwsS3ErrorCodes.S3_GET_OBJECT_LIST_FAILED);
    }
  }

  public async deleteObject(key: string, isMediaBucket: boolean = false): Promise<DeleteObjectCommandOutput> {
    try {
      const bucketName = this.getBucketName(isMediaBucket);
      const deleteObjectCommand = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      return await this.s3Client.send(deleteObjectCommand);
    } catch (error) {
      this.lokiLogger.error(`Error deleting object:${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException(EAwsS3ErrorCodes.S3_DELETE_OBJECT_FAILED);
    }
  }

  public async deleteObjects(objects: ObjectIdentifier[], isMediaBucket: boolean = false): Promise<void> {
    try {
      const bucketName = this.getBucketName(isMediaBucket);
      const deleteObjectsCommand = new DeleteObjectsCommand({
        Bucket: bucketName,
        Delete: {
          Objects: objects,
        },
      });

      await this.s3Client.send(deleteObjectsCommand);
    } catch (error) {
      this.lokiLogger.error(`Error deleting objects:${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException(EAwsS3ErrorCodes.S3_DELETE_OBJECTS_FAILED);
    }
  }

  public async copyObject(
    key: string,
    copySource: string,
    isMediaBucket: boolean = false,
  ): Promise<CopyObjectCommandOutput> {
    try {
      const bucketName = this.getBucketName(isMediaBucket);
      const formattedCopySource = `${bucketName}/${copySource}`;

      const copyObjectCommand = new CopyObjectCommand({
        Bucket: bucketName,
        CopySource: formattedCopySource,
        Key: key,
      });

      return await this.s3Client.send(copyObjectCommand);
    } catch (error) {
      this.lokiLogger.error(`Error copying object:${(error as Error).message}`, (error as Error).stack);
      throw new ServiceUnavailableException(EAwsS3ErrorCodes.S3_COPY_OBJECT_FAILED);
    }
  }

  private getBucketName(isMediaBucket: boolean): string {
    return isMediaBucket ? this.mediaBucket : this.privateBucket;
  }

  public getMediaObjectUrl(key: string): string {
    return `https://${this.mediaBucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  public getKeyFromUrl(url: string): string {
    const parsedUrl = new URL(url);

    return parsedUrl.pathname.slice(1);
  }
}

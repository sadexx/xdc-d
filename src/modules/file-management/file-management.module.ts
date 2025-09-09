import { Module } from "@nestjs/common";
import { AwsS3Module } from "src/modules/aws/s3/aws-s3.module";
import { FileManagementController } from "src/modules/file-management/controllers";
import { AwsS3Service } from "src/modules/aws/s3/aws-s3.service";
import { CustomStorageService } from "src/modules/file-management/common/storages";
import { FileManagementService } from "src/modules/file-management/services";

@Module({
  imports: [AwsS3Module],
  controllers: [FileManagementController],
  providers: [
    FileManagementService,
    {
      provide: CustomStorageService,
      useFactory: async (
        awsS3Service: AwsS3Service,
        fileManagementService: FileManagementService,
      ): Promise<CustomStorageService> => {
        return new CustomStorageService(awsS3Service, fileManagementService);
      },
      inject: [AwsS3Service, FileManagementService],
    },
  ],
  exports: [FileManagementService, CustomStorageService],
})
export class FileManagementModule {}

import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AwsS3Module } from "src/modules/aws/s3/aws-s3.module";
import { UiLanguagesController } from "src/modules/ui-languages/controllers";
import { UiLanguage } from "src/modules/ui-languages/entities";
import { UiLanguagesService } from "src/modules/ui-languages/services";
import { FileManagementModule } from "src/modules/file-management/file-management.module";

@Module({
  imports: [TypeOrmModule.forFeature([UiLanguage]), AwsS3Module, FileManagementModule],
  controllers: [UiLanguagesController],
  providers: [UiLanguagesService],
  exports: [UiLanguagesService],
})
export class UiLanguagesModule {}

import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AwsS3Module } from "src/modules/aws/s3/aws-s3.module";
import { ContentManagementController } from "src/modules/content-management/controllers";
import { ContentManagement, Promo } from "src/modules/content-management/entities";
import { ContentManagementService } from "src/modules/content-management/services";
import { FileManagementModule } from "src/modules/file-management/file-management.module";
import { ReviewsModule } from "src/modules/reviews/reviews.module";

@Module({
  imports: [TypeOrmModule.forFeature([Promo, ContentManagement]), AwsS3Module, FileManagementModule, ReviewsModule],
  controllers: [ContentManagementController],
  providers: [ContentManagementService],
  exports: [ContentManagementService],
})
export class ContentManagementModule {}

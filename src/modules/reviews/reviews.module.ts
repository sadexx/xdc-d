import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AwsS3Module } from "src/modules/aws/s3/aws-s3.module";
import { ReviewsController } from "src/modules/reviews/controllers";
import { Review } from "src/modules/reviews/entities";
import { ReviewsService } from "src/modules/reviews/services";

@Module({
  imports: [TypeOrmModule.forFeature([Review]), AwsS3Module],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}

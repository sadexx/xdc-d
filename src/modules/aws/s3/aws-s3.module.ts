import { Module } from "@nestjs/common";
import { AwsS3Service } from "src/modules/aws/s3/aws-s3.service";
import { AwsConfigModule } from "src/modules/aws/config/aws-config.module";

@Module({
  imports: [AwsConfigModule],
  providers: [AwsS3Service],
  exports: [AwsS3Service],
})
export class AwsS3Module {}

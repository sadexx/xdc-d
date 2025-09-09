import { Module } from "@nestjs/common";
import { AwsPinpointService } from "src/modules/aws/pinpoint/services";
import { AwsPinpointController } from "src/modules/aws/pinpoint/controllers";
import { AwsConfigModule } from "src/modules/aws/config/aws-config.module";

@Module({
  imports: [AwsConfigModule],
  controllers: [AwsPinpointController],
  providers: [AwsPinpointService],
  exports: [AwsPinpointService],
})
export class AwsPinpointModule {}

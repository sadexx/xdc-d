import { Module } from "@nestjs/common";
import { AwsChimeSdkService } from "src/modules/aws/chime-sdk/aws-chime-sdk.service";
import { AwsConfigModule } from "src/modules/aws/config/aws-config.module";

@Module({
  imports: [AwsConfigModule],
  providers: [AwsChimeSdkService],
  exports: [AwsChimeSdkService],
})
export class AwsChimeSdkModule {}

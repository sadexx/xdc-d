import { Module } from "@nestjs/common";
import { AwsMessagingSdkService } from "src/modules/aws/messaging-sdk/aws-messaging-sdk.service";
import { AwsConfigModule } from "src/modules/aws/config/aws-config.module";

@Module({
  imports: [AwsConfigModule],
  providers: [AwsMessagingSdkService],
  exports: [AwsMessagingSdkService],
})
export class AwsMessagingSdkModule {}

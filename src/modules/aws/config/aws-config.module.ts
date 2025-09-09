import { Module } from "@nestjs/common";
import { AwsConfigService } from "src/modules/aws/config/services";

@Module({
  imports: [],
  providers: [AwsConfigService],
  exports: [AwsConfigService],
})
export class AwsConfigModule {}

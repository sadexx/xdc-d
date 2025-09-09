import { Module } from "@nestjs/common";
import { PaypalSdkService } from "src/modules/paypal/services";

@Module({
  providers: [PaypalSdkService],
  controllers: [],
  exports: [PaypalSdkService],
})
export class PaypalModule {}

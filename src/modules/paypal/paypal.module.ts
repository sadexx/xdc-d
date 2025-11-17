import { Module } from "@nestjs/common";
import { PaypalSdkService } from "src/modules/paypal/services";

@Module({
  providers: [PaypalSdkService],
  exports: [PaypalSdkService],
})
export class PaypalModule {}

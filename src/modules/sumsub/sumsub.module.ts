import { Module } from "@nestjs/common";
import { SumSubCheck } from "src/modules/sumsub/entities";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ActivationTrackingModule } from "src/modules/activation-tracking/activation-tracking.module";
import { SumSubSdkService, SumSubService } from "src/modules/sumsub/services";
import { SumSubController } from "src/modules/sumsub/controllers";
import { AccessControlModule } from "src/modules/access-control/access-control.module";
import { UserRole } from "src/modules/users/entities";

@Module({
  imports: [TypeOrmModule.forFeature([SumSubCheck, UserRole]), ActivationTrackingModule, AccessControlModule],
  controllers: [SumSubController],
  providers: [SumSubService, SumSubSdkService],
  exports: [SumSubService, SumSubSdkService],
})
export class SumSubModule {}

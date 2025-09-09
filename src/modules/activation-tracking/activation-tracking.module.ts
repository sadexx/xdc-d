import { Module } from "@nestjs/common";
import { ActivationTrackingService } from "src/modules/activation-tracking/services/activation-tracking.service";
import { DocusignModule } from "src/modules/docusign/docusign.module";
import { MockModule } from "src/modules/mock/mock.module";
import { AccountActivationModule } from "src/modules/account-activation/account-activation.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "src/modules/users/entities";

@Module({
  imports: [TypeOrmModule.forFeature([User]), DocusignModule, MockModule, AccountActivationModule],
  providers: [ActivationTrackingService],
  exports: [ActivationTrackingService],
})
export class ActivationTrackingModule {}

import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AbnController } from "src/modules/abn/controllers";
import { AbnService } from "src/modules/abn/services";
import { AbnCheck } from "src/modules/abn/entities";
import { ActivationTrackingModule } from "src/modules/activation-tracking/activation-tracking.module";
import { MockModule } from "src/modules/mock/mock.module";
import { UserRole } from "src/modules/users/entities";
import { Company } from "src/modules/companies/entities";
import { EmailsModule } from "src/modules/emails/emails.module";
import { HelperModule } from "src/modules/helper/helper.module";
import { AccessControlModule } from "src/modules/access-control/access-control.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([AbnCheck, Company, UserRole]),
    ActivationTrackingModule,
    MockModule,
    EmailsModule,
    HelperModule,
    AccessControlModule,
  ],
  providers: [AbnService],
  controllers: [AbnController],
  exports: [],
})
export class AbnModule {}

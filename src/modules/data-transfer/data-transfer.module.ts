import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User, UserDocument, UserProfile } from "src/modules/users/entities";
import { UserRole } from "src/modules/users/entities";
import { Role } from "src/modules/users/entities";
import { Address } from "src/modules/addresses/entities";
import { SumSubCheck } from "src/modules/sumsub/entities";
import { AccountActivationModule } from "src/modules/account-activation/account-activation.module";
import { AbnCheck } from "src/modules/abn/entities";
import { CustomInsurance } from "src/modules/interpreters/profile/entities";
import { BackyCheck } from "src/modules/backy-check/entities";
import { UserConcessionCard } from "src/modules/concession-card/entities";
import { ActivationTrackingModule } from "src/modules/activation-tracking/activation-tracking.module";
import { ActivationStepsTransferService } from "src/modules/data-transfer/services";
import { AwsS3Module } from "src/modules/aws/s3/aws-s3.module";
import { HelperModule } from "src/modules/helper/helper.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserRole,
      Role,
      Address,
      UserProfile,
      SumSubCheck,
      AbnCheck,
      CustomInsurance,
      BackyCheck,
      UserConcessionCard,
      UserDocument,
      User,
    ]),
    AccountActivationModule,
    ActivationTrackingModule,
    AwsS3Module,
    HelperModule,
  ],
  providers: [ActivationStepsTransferService],
  exports: [ActivationStepsTransferService],
})
export class DataTransferModule {}

import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  CustomInsurance,
  InterpreterCancellationRecord,
  InterpreterProfile,
  LanguagePair,
} from "src/modules/interpreters/profile/entities";
import { InterpreterProfileController } from "src/modules/interpreters/profile/controllers";
import {
  InterpreterCancellationRecordService,
  InterpreterProfileService,
} from "src/modules/interpreters/profile/services";
import { ActivationTrackingModule } from "src/modules/activation-tracking/activation-tracking.module";
import { InterpreterBadgeModule } from "src/modules/interpreters/badge/interpreter-badge.module";
import { AppointmentsSharedModule } from "src/modules/appointments/shared/appointments-shared.module";
import { AccessControlModule } from "src/modules/access-control/access-control.module";
import { UserRole } from "src/modules/users/entities";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InterpreterProfile,
      InterpreterCancellationRecord,
      LanguagePair,
      CustomInsurance,
      UserRole,
    ]),
    ActivationTrackingModule,
    InterpreterBadgeModule,
    AppointmentsSharedModule,
    AccessControlModule,
  ],
  controllers: [InterpreterProfileController],
  providers: [InterpreterProfileService, InterpreterCancellationRecordService],
  exports: [InterpreterProfileService, InterpreterCancellationRecordService],
})
export class InterpreterProfileModule {}

import { forwardRef, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  Appointment,
  AppointmentAdminInfo,
  AppointmentCancellationInfo,
  AppointmentExternalSession,
  AppointmentRating,
  AppointmentReminder,
} from "src/modules/appointments/appointment/entities";
import {
  AppointmentsCommandController,
  AppointmentsQueryController,
} from "src/modules/appointments/appointment/controllers";
import {
  AppointmentCancelService,
  AppointmentCommandService,
  AppointmentCreateService,
  AppointmentEndService,
  AppointmentExtensionService,
  AppointmentExternalSessionService,
  AppointmentQueryService,
  AppointmentRatingService,
  AppointmentRecreateService,
  AppointmentSchedulerService,
  AppointmentUpdateService,
} from "src/modules/appointments/appointment/services";
import { UserRole } from "src/modules/users/entities";
import { ChimeMeetingConfigurationModule } from "src/modules/chime-meeting-configuration/chime-meeting-configuration.module";
import { MultiWayParticipantModule } from "src/modules/multi-way-participant/multi-way-participant.module";
import { ChimeMeetingConfiguration } from "src/modules/chime-meeting-configuration/entities";
import { ChimeMessagingConfigurationModule } from "src/modules/chime-messaging-configuration/chime-messaging-configuration.module";
import { InterpreterProfileModule } from "src/modules/interpreters/profile/interpreter-profile.module";
import { AppointmentsSharedModule } from "src/modules/appointments/shared/appointments-shared.module";
import { DiscountsModule } from "src/modules/discounts/discounts.module";
import { MembershipsModule } from "src/modules/memberships/memberships.module";
import { OldPaymentsModule } from "src/modules/payments/old-payments.module";
import { Address } from "src/modules/addresses/entities";
import { AppointmentFailedPaymentCancelModule } from "src/modules/appointments/failed-payment-cancel/appointment-failed-payment-cancel.module";
import { AppointmentOrdersSharedModule } from "src/modules/appointment-orders/shared/appointment-orders-shared.module";
import { AppointmentOrdersWorkflowModule } from "src/modules/appointment-orders/workflow/appointment-orders-workflow.module";
import { HelperModule } from "src/modules/helper/helper.module";
import { PromoCampaignsModule } from "src/modules/promo-campaigns/promo-campaigns.module";
import { Rate } from "src/modules/rates/entities";
import { QueueModule } from "src/modules/queues/queues.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Appointment,
      AppointmentAdminInfo,
      AppointmentCancellationInfo,
      UserRole,
      ChimeMeetingConfiguration,
      AppointmentReminder,
      AppointmentRating,
      Address,
      AppointmentExternalSession,
      Rate,
    ]),
    forwardRef(() => ChimeMeetingConfigurationModule),
    QueueModule,
    AppointmentsSharedModule,
    AppointmentOrdersSharedModule,
    AppointmentOrdersWorkflowModule,
    MultiWayParticipantModule,
    ChimeMessagingConfigurationModule,
    InterpreterProfileModule,
    DiscountsModule,
    MembershipsModule,
    OldPaymentsModule,
    AppointmentFailedPaymentCancelModule,
    HelperModule,
    PromoCampaignsModule,
  ],
  controllers: [AppointmentsCommandController, AppointmentsQueryController],
  providers: [
    AppointmentCreateService,
    AppointmentUpdateService,
    AppointmentCancelService,
    AppointmentCommandService,
    AppointmentQueryService,
    AppointmentSchedulerService,
    AppointmentRatingService,
    AppointmentEndService,
    AppointmentExtensionService,
    AppointmentRecreateService,
    AppointmentExternalSessionService,
  ],
  exports: [
    AppointmentUpdateService,
    AppointmentCommandService,
    AppointmentQueryService,
    AppointmentSchedulerService,
    AppointmentCancelService,
    AppointmentExtensionService,
    AppointmentEndService,
    AppointmentExternalSessionService,
  ],
})
export class AppointmentsModule {}

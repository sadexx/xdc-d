import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { DiscountsModule } from "src/modules/discounts/discounts.module";
import {
  AppointmentFailedPaymentCancelService,
  AppointmentFailedPaymentCancelTempService,
} from "src/modules/appointments/failed-payment-cancel/services";
import { ChimeMessagingConfigurationModule } from "src/modules/chime-messaging-configuration/chime-messaging-configuration.module";
import { ChimeMeetingConfiguration } from "src/modules/chime-meeting-configuration/entities";
import { AppointmentOrder, AppointmentOrderGroup } from "src/modules/appointment-orders/appointment-order/entities";
import { NotificationModule } from "src/modules/notifications/notification.module";
import { AppointmentsSharedModule } from "src/modules/appointments/shared/appointments-shared.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Appointment, ChimeMeetingConfiguration, AppointmentOrder, AppointmentOrderGroup]),
    AppointmentsSharedModule,
    DiscountsModule,
    ChimeMessagingConfigurationModule,
    NotificationModule,
  ],
  providers: [AppointmentFailedPaymentCancelService, AppointmentFailedPaymentCancelTempService],
  exports: [AppointmentFailedPaymentCancelService, AppointmentFailedPaymentCancelTempService],
})
export class AppointmentFailedPaymentCancelModule {}

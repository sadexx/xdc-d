import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AppointmentOrder, AppointmentOrderGroup } from "src/modules/appointment-orders/appointment-order/entities";
import {
  AppointmentOrdersCommandController,
  AppointmentOrdersQueryController,
} from "src/modules/appointment-orders/appointment-order/controllers";
import {
  AppointmentOrderCommandService,
  AppointmentOrderQueryService,
  OrderSchedulerService,
  AppointmentOrderExpirationCancelService,
  AppointmentOrderNotificationService,
  AppointmentOrderInterpreterAdditionService,
} from "src/modules/appointment-orders/appointment-order/services";
import { AppointmentsModule } from "src/modules/appointments/appointment/appointments.module";
import { UserRole } from "src/modules/users/entities";
import { NotificationModule } from "src/modules/notifications/notification.module";
import { Appointment, AppointmentAdminInfo, AppointmentReminder } from "src/modules/appointments/appointment/entities";
import { SearchEngineLogicModule } from "src/modules/search-engine-logic/search-engine-logic.module";
import { AppointmentOrdersSharedModule } from "src/modules/appointment-orders/shared/appointment-orders-shared.module";
import { Channel } from "src/modules/chime-messaging-configuration/entities";
import { ChimeMeetingConfigurationModule } from "src/modules/chime-meeting-configuration/chime-meeting-configuration.module";
import { ChimeMeetingConfiguration } from "src/modules/chime-meeting-configuration/entities";
import { HelperModule } from "src/modules/helper/helper.module";
import { EmailsModule } from "src/modules/emails/emails.module";
import { AppointmentsSharedModule } from "src/modules/appointments/shared/appointments-shared.module";
import { QueueModule } from "src/modules/queues/queues.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Appointment,
      AppointmentOrder,
      AppointmentOrderGroup,
      AppointmentAdminInfo,
      UserRole,
      Channel,
      ChimeMeetingConfiguration,
      AppointmentReminder,
    ]),
    AppointmentsModule,
    ChimeMeetingConfigurationModule,
    AppointmentOrdersSharedModule,
    AppointmentsSharedModule,
    SearchEngineLogicModule,
    NotificationModule,
    HelperModule,
    EmailsModule,
    QueueModule,
  ],
  controllers: [AppointmentOrdersCommandController, AppointmentOrdersQueryController],
  providers: [
    AppointmentOrderExpirationCancelService,
    AppointmentOrderCommandService,
    AppointmentOrderQueryService,
    OrderSchedulerService,
    AppointmentOrderNotificationService,
    AppointmentOrderInterpreterAdditionService,
  ],
  exports: [AppointmentOrderQueryService, OrderSchedulerService],
})
export class AppointmentOrdersModule {}

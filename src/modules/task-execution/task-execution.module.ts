import { Module } from "@nestjs/common";
import { TaskExecutionService, TaskDispatcherService } from "src/modules/task-execution/services";
import { BackyCheckModule } from "src/modules/backy-check/backy-check.module";
import { StatisticsModule } from "src/modules/statistics/statistics.module";
import { NotificationModule } from "src/modules/notifications/notification.module";
import { EventReminderModule } from "src/modules/event-reminder/event-reminder.module";
import { AppointmentsModule } from "src/modules/appointments/appointment/appointments.module";
import { ChimeMessagingConfigurationModule } from "src/modules/chime-messaging-configuration/chime-messaging-configuration.module";
import { AppointmentOrdersModule } from "src/modules/appointment-orders/appointment-order/appointment-orders.module";
import { DraftAppointmentsModule } from "src/modules/draft-appointments/draft-appointments.module";
import { RemovalModule } from "src/modules/removal/removal.module";
import { MembershipsModule } from "src/modules/memberships/memberships.module";
import { CompaniesDepositChargeModule } from "src/modules/companies-deposit-charge/companies-deposit-charge.module";
import { InterpreterProfileModule } from "src/modules/interpreters/profile/interpreter-profile.module";
import { TaskExecutionController } from "src/modules/task-execution/controllers";
import { CustomPrometheusModule } from "src/modules/prometheus/prometheus.module";
import { PromoCampaignsModule } from "src/modules/promo-campaigns/promo-campaigns.module";
import { PaymentsModule } from "src/modules/payments/payments.module";

@Module({
  imports: [
    CustomPrometheusModule,
    BackyCheckModule,
    StatisticsModule,
    NotificationModule,
    EventReminderModule,
    AppointmentsModule,
    ChimeMessagingConfigurationModule,
    AppointmentOrdersModule,
    DraftAppointmentsModule,
    RemovalModule,
    MembershipsModule,
    CompaniesDepositChargeModule,
    InterpreterProfileModule,
    PromoCampaignsModule,
    PaymentsModule,
  ],
  controllers: [TaskExecutionController],
  providers: [TaskExecutionService, TaskDispatcherService],
})
export class TaskExecutionModule {}

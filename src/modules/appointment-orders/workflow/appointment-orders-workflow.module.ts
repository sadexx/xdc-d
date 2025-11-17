import { forwardRef, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { AppointmentOrder, AppointmentOrderGroup } from "src/modules/appointment-orders/appointment-order/entities";
import {
  AppointmentOrderCreateService,
  AppointmentOrderRecreationService,
} from "src/modules/appointment-orders/workflow/services";
import { UserRole } from "src/modules/users/entities";
import { AppointmentOrdersSharedModule } from "src/modules/appointment-orders/shared/appointment-orders-shared.module";
import { Channel } from "src/modules/chime-messaging-configuration/entities";
import { AppointmentsModule } from "src/modules/appointments/appointment/appointments.module";
import { QueueModule } from "src/modules/queues/queues.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Appointment, AppointmentOrder, AppointmentOrderGroup, UserRole, Channel]),
    forwardRef(() => AppointmentsModule),
    AppointmentOrdersSharedModule,
    QueueModule,
  ],
  providers: [AppointmentOrderCreateService, AppointmentOrderRecreationService],
  exports: [AppointmentOrderCreateService, AppointmentOrderRecreationService],
})
export class AppointmentOrdersWorkflowModule {}

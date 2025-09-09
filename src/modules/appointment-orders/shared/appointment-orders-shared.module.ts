import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  AppointmentOrderQueryOptionsService,
  AppointmentOrderSharedLogicService,
  SearchTimeFrameService,
} from "src/modules/appointment-orders/shared/services";
import { NotificationModule } from "src/modules/notifications/notification.module";
import { AppointmentOrder, AppointmentOrderGroup } from "src/modules/appointment-orders/appointment-order/entities";
import { BookingSlotManagementModule } from "src/modules/booking-slot-management/booking-slot-management.module";
import { InterpreterProfile } from "src/modules/interpreters/profile/entities";

@Module({
  imports: [
    TypeOrmModule.forFeature([AppointmentOrder, AppointmentOrderGroup, InterpreterProfile]),
    NotificationModule,
    BookingSlotManagementModule,
  ],
  providers: [AppointmentOrderQueryOptionsService, AppointmentOrderSharedLogicService, SearchTimeFrameService],
  exports: [AppointmentOrderQueryOptionsService, AppointmentOrderSharedLogicService, SearchTimeFrameService],
})
export class AppointmentOrdersSharedModule {}

import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  BookingSlotManagementQueryOptionsService,
  BookingSlotManagementService,
} from "src/modules/booking-slot-management/services";
import { Appointment } from "src/modules/appointments/appointment/entities";

@Module({
  imports: [TypeOrmModule.forFeature([Appointment])],
  controllers: [],
  providers: [BookingSlotManagementService, BookingSlotManagementQueryOptionsService],
  exports: [BookingSlotManagementService],
})
export class BookingSlotManagementModule {}

import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { NotificationModule } from "src/modules/notifications/notification.module";
import { Appointment, AppointmentReminder } from "src/modules/appointments/appointment/entities";
import { EventReminderService } from "src/modules/event-reminder/services";

@Module({
  imports: [TypeOrmModule.forFeature([Appointment, AppointmentReminder]), NotificationModule],
  providers: [EventReminderService],
  controllers: [],
  exports: [EventReminderService],
})
export class EventReminderModule {}

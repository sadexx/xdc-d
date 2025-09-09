import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  AppointmentNotificationService,
  AppointmentQueryOptionsService,
  AppointmentSharedService,
} from "src/modules/appointments/shared/services";
import { BookingSlotManagementModule } from "src/modules/booking-slot-management/booking-slot-management.module";
import { UrlShortenerModule } from "src/modules/url-shortener/url-shortener.module";
import { EmailsModule } from "src/modules/emails/emails.module";
import { NotificationModule } from "src/modules/notifications/notification.module";
import { AwsPinpointModule } from "src/modules/aws/pinpoint/aws-pinpoint.module";
import { AppointmentAdminInfo, AppointmentReminder } from "src/modules/appointments/appointment/entities";
import { ChimeMeetingConfiguration } from "src/modules/chime-meeting-configuration/entities";
import { ShortUrl } from "src/modules/url-shortener/entities";
import { RedisModule } from "src/modules/redis/redis.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([AppointmentAdminInfo, AppointmentReminder, ChimeMeetingConfiguration, ShortUrl]),
    BookingSlotManagementModule,
    UrlShortenerModule,
    EmailsModule,
    NotificationModule,
    AwsPinpointModule,
    RedisModule,
  ],
  providers: [AppointmentQueryOptionsService, AppointmentNotificationService, AppointmentSharedService],
  exports: [AppointmentQueryOptionsService, AppointmentNotificationService, AppointmentSharedService],
})
export class AppointmentsSharedModule {}

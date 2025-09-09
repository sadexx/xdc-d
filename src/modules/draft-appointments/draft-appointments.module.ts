import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  DraftAddress,
  DraftAppointment,
  DraftExtraDay,
  DraftMultiWayParticipant,
} from "src/modules/draft-appointments/entities";
import { DraftAppointmentsController } from "src/modules/draft-appointments/controllers";
import { DraftAppointmentQueryOptionsService, DraftAppointmentService } from "src/modules/draft-appointments/services";
import { UserRole } from "src/modules/users/entities";
import { NotificationModule } from "src/modules/notifications/notification.module";
import { EmailsModule } from "src/modules/emails/emails.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([DraftAppointment, DraftMultiWayParticipant, DraftAddress, DraftExtraDay, UserRole]),
    NotificationModule,
    EmailsModule,
  ],
  controllers: [DraftAppointmentsController],
  providers: [DraftAppointmentService, DraftAppointmentQueryOptionsService],
  exports: [DraftAppointmentService],
})
export class DraftAppointmentsModule {}

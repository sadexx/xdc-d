import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AwsChimeSdkModule } from "src/modules/aws/chime-sdk/aws-chime-sdk.module";
import { ChimeMeetingConfigurationController } from "src/modules/chime-meeting-configuration/controllers";
import { Attendee, ChimeMeetingConfiguration } from "src/modules/chime-meeting-configuration/entities";
import {
  AttendeeCreationService,
  AttendeeManagementService,
  ChimeMeetingQueryOptionsService,
  MeetingClosingService,
  MeetingCreationService,
  MeetingJoinService,
  SipMediaService,
} from "src/modules/chime-meeting-configuration/services";
import { UserRole } from "src/modules/users/entities";
import { MultiWayParticipant } from "src/modules/multi-way-participant/entities";
import { AppointmentsModule } from "src/modules/appointments/appointment/appointments.module";
import { AppointmentOrdersSharedModule } from "src/modules/appointment-orders/shared/appointment-orders-shared.module";
import { Appointment, AppointmentAdminInfo } from "src/modules/appointments/appointment/entities";
import { AppointmentsSharedModule } from "src/modules/appointments/shared/appointments-shared.module";
import { SettingsModule } from "src/modules/settings/settings.module";
import { QueueModule } from "src/modules/queues/queues.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChimeMeetingConfiguration,
      Attendee,
      Appointment,
      AppointmentAdminInfo,
      UserRole,
      MultiWayParticipant,
    ]),
    AwsChimeSdkModule,
    QueueModule,
    AppointmentsSharedModule,
    AppointmentOrdersSharedModule,
    AppointmentsModule,
    SettingsModule,
  ],
  providers: [
    MeetingCreationService,
    AttendeeCreationService,
    MeetingJoinService,
    AttendeeManagementService,
    SipMediaService,
    MeetingClosingService,
    ChimeMeetingQueryOptionsService,
  ],
  controllers: [ChimeMeetingConfigurationController],
  exports: [
    MeetingCreationService,
    AttendeeCreationService,
    MeetingJoinService,
    AttendeeManagementService,
    MeetingClosingService,
  ],
})
export class ChimeMeetingConfigurationModule {}

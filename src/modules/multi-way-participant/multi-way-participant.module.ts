import { forwardRef, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MultiWayParticipantService } from "src/modules/multi-way-participant/services";
import { MultiWayParticipant } from "src/modules/multi-way-participant/entities";
import { MultiWayParticipantController } from "src/modules/multi-way-participant/controllers";
import { Attendee, ChimeMeetingConfiguration } from "src/modules/chime-meeting-configuration/entities";
import { ChimeMeetingConfigurationModule } from "src/modules/chime-meeting-configuration/chime-meeting-configuration.module";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { AppointmentsSharedModule } from "src/modules/appointments/shared/appointments-shared.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([MultiWayParticipant, Attendee, Appointment, ChimeMeetingConfiguration]),
    forwardRef(() => ChimeMeetingConfigurationModule),
    AppointmentsSharedModule,
  ],
  controllers: [MultiWayParticipantController],
  providers: [MultiWayParticipantService],
  exports: [MultiWayParticipantService],
})
export class MultiWayParticipantModule {}

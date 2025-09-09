import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ChimeMeetingConfiguration } from "src/modules/chime-meeting-configuration/entities";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { EAppointmentCommunicationType } from "src/modules/appointments/appointment/common/enums";
import {
  EExternalVideoResolution,
  EExtMeetingFeatureStatus,
  EExtVideoContentResolution,
} from "src/modules/chime-meeting-configuration/common/enums";
import { ICreateMeetingConfig } from "src/modules/chime-meeting-configuration/common/interfaces";
import { BadRequestException, Injectable } from "@nestjs/common";
import { LokiLogger } from "src/common/logger";

@Injectable()
export class MeetingCreationService {
  private readonly lokiLogger = new LokiLogger(MeetingCreationService.name);
  private readonly DEFAULT_PARTICIPANTS: number = 10;

  constructor(
    @InjectRepository(ChimeMeetingConfiguration)
    private readonly chimeMeetingConfigurationRepository: Repository<ChimeMeetingConfiguration>,
  ) {}

  public async constructAndCreateMeetingConfiguration(
    appointment: Appointment,
    participants: number,
  ): Promise<ChimeMeetingConfiguration> {
    const meetingCapabilities = await this.determineMeetingCapabilities(appointment.id, appointment.communicationType);
    const createMeetingConfig = await this.constructMeetingConfigurationDto(
      appointment,
      participants,
      meetingCapabilities,
    );

    return await this.createMeetingConfiguration(createMeetingConfig);
  }

  private async determineMeetingCapabilities(
    id: string,
    communicationType: EAppointmentCommunicationType,
  ): Promise<{
    echoReduction: EExtMeetingFeatureStatus;
    maxVideoResolution: EExternalVideoResolution;
    maxContentResolution: EExtVideoContentResolution;
  }> {
    switch (communicationType) {
      case EAppointmentCommunicationType.AUDIO:
        return {
          echoReduction: EExtMeetingFeatureStatus.AVAILABLE,
          maxVideoResolution: EExternalVideoResolution.NONE,
          maxContentResolution: EExtVideoContentResolution.NONE,
        };
      case EAppointmentCommunicationType.VIDEO:
        return {
          echoReduction: EExtMeetingFeatureStatus.AVAILABLE,
          maxVideoResolution: EExternalVideoResolution.FHD,
          maxContentResolution: EExtVideoContentResolution.FHD,
        };

      default:
        this.lokiLogger.error(
          `Invalid communication type for appointment Id: ${id}, configuration: ${communicationType}`,
        );
        throw new BadRequestException("Invalid communication type for meeting configuration");
    }
  }

  private async constructMeetingConfigurationDto(
    appointment: Appointment,
    participants: number,
    capabilities: {
      echoReduction: EExtMeetingFeatureStatus;
      maxVideoResolution: EExternalVideoResolution;
      maxContentResolution: EExtVideoContentResolution;
    },
  ): Promise<ICreateMeetingConfig> {
    return {
      appointment: appointment,
      meetingScheduledStartTime: appointment.scheduledStartTime,
      ...capabilities,
      maxAttendees: participants + this.DEFAULT_PARTICIPANTS,
    };
  }

  private async createMeetingConfiguration(dto: ICreateMeetingConfig): Promise<ChimeMeetingConfiguration> {
    const newMeetingConfiguration = this.chimeMeetingConfigurationRepository.create(dto);
    const savedMeetingConfiguration = await this.chimeMeetingConfigurationRepository.save(newMeetingConfiguration);

    return savedMeetingConfiguration;
  }
}

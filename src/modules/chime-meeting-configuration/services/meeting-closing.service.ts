import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, EntityManager, Repository } from "typeorm";
import { Attendee, ChimeMeetingConfiguration } from "src/modules/chime-meeting-configuration/entities";
import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { AwsChimeSdkService } from "src/modules/aws/chime-sdk/aws-chime-sdk.service";
import { EAppointmentSchedulingType } from "src/modules/appointments/appointment/common/enums";
import { AppointmentEndService } from "src/modules/appointments/appointment/services";
import { findOneOrFailTyped, getCurrentDateParts } from "src/common/utils";
import { IMessageOutput } from "src/common/outputs";
import { LokiLogger } from "src/common/logger";
import { ChimeMeetingQueryOptionsService } from "src/modules/chime-meeting-configuration/services";
import { TChimeMeetingForClosure } from "src/modules/chime-meeting-configuration/common/types";
import { TAppointmentsWithoutClientVisit } from "src/modules/appointments/appointment/common/types";
import { ERecordDirectory } from "src/modules/aws/chime-sdk/common/enum";
import { AppointmentSharedService } from "src/modules/appointments/shared/services";
import { SettingsService } from "src/modules/settings/services";
import { secondsToMilliseconds } from "date-fns";
import {
  EChimeMeetingConfigurationErrorCodes,
  EMeetingClosureAction,
} from "src/modules/chime-meeting-configuration/common/enums";
import { IMeetingClosureDecision } from "src/modules/chime-meeting-configuration/common/interfaces";
import { QueueInitializeService } from "src/modules/queues/services";

@Injectable()
export class MeetingClosingService {
  private readonly lokiLogger = new LokiLogger(MeetingClosingService.name);

  constructor(
    @InjectRepository(ChimeMeetingConfiguration)
    private readonly chimeMeetingConfigurationRepository: Repository<ChimeMeetingConfiguration>,
    @InjectRepository(Attendee)
    private readonly attendeeRepository: Repository<Attendee>,
    private readonly appointmentEndService: AppointmentEndService,
    private readonly appointmentSharedService: AppointmentSharedService,
    private readonly chimeSdkService: AwsChimeSdkService,
    private readonly chimeMeetingQueryService: ChimeMeetingQueryOptionsService,
    private readonly settingsService: SettingsService,
    private readonly queueInitializeService: QueueInitializeService,
    private readonly dataSource: DataSource,
  ) {}

  public async leaveMeeting(meetingConfigId: string, attendeeId: string): Promise<IMessageOutput> {
    const result = await this.attendeeRepository.update(
      { chimeMeetingConfigurationId: meetingConfigId, attendeeId: attendeeId },
      { isOnline: false },
    );

    if (!result.affected || result.affected === 0) {
      this.lokiLogger.error(
        `Failed to update status in attendee Id: ${attendeeId} at meeting-config Id: ${meetingConfigId}`,
      );
      throw new NotFoundException(EChimeMeetingConfigurationErrorCodes.MEETING_CLOSING_UPDATE_ATTENDEE_FAILED);
    }

    return { message: "Successfully left meeting" };
  }

  public async closeMeetingsWithoutClientVisit(appointment: TAppointmentsWithoutClientVisit): Promise<void> {
    const { chimeMeetingConfiguration } = appointment;

    this.lokiLogger.log(`Closing expired scheduled appointment with Id: ${appointment.id}`);
    await this.dataSource.transaction(async (manager) => {
      await this.appointmentEndService.finalizeChimeVirtualAppointmentWithoutClientVisit(manager, appointment);
    });

    if (!chimeMeetingConfiguration) {
      this.lokiLogger.error(`No Chime Meeting Configuration found for appointment Id: ${appointment.id}`);

      return;
    }

    await this.appointmentSharedService.deleteChimeMeetingWithAttendees(chimeMeetingConfiguration);
  }

  public async queueMeetingClosure(chimeMeetingId: string): Promise<IMessageOutput> {
    await this.queueInitializeService.addCloseMeetingQueue(chimeMeetingId);

    return { message: "Meeting closed successfully" };
  }

  public async closeMeeting(chimeMeetingId: string): Promise<void> {
    try {
      const queryOptions = this.chimeMeetingQueryService.getChimeMeetingForClosingOptions(chimeMeetingId);
      const meetingConfig = await findOneOrFailTyped<TChimeMeetingForClosure>(
        chimeMeetingId,
        this.chimeMeetingConfigurationRepository,
        queryOptions,
      );

      if (!meetingConfig.chimeMeetingId || !meetingConfig.appointment.appointmentAdminInfo) {
        this.lokiLogger.error(
          `Meeting Id: ${chimeMeetingId} not found meetingConfig: ${JSON.stringify(meetingConfig)}`,
        );
        throw new NotFoundException(EChimeMeetingConfigurationErrorCodes.MEETING_CLOSING_MEETING_NOT_FOUND);
      }

      const closureDecision = await this.determineMeetingClosureAction(meetingConfig);

      await this.dataSource.transaction(async (manager) => {
        if (closureDecision.action === EMeetingClosureAction.CLOSE_NORMALLY) {
          await this.handleMeetingClosure(manager, meetingConfig);
        } else {
          await this.handleMeetingCancellation(manager, meetingConfig, closureDecision.reason as string);
        }
      });

      await this.deleteMeetingRelatedResources(meetingConfig);
    } catch (error) {
      this.lokiLogger.error(
        `Failed to close meeting id: ${chimeMeetingId}, message: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new ServiceUnavailableException(EChimeMeetingConfigurationErrorCodes.MEETING_CLOSING_UNABLE_CLOSE_MEETING);
    }
  }

  private async determineMeetingClosureAction(
    meetingConfig: TChimeMeetingForClosure,
  ): Promise<IMeetingClosureDecision> {
    const { schedulingType, appointmentAdminInfo, appointmentOrder, businessStartTime } = meetingConfig.appointment;

    if (schedulingType === EAppointmentSchedulingType.ON_DEMAND) {
      const settings = await this.settingsService.getSettings();
      const onDemandCancellationTimeLimitMs = secondsToMilliseconds(settings.cancelOnDemandGracePeriodSeconds);

      if (businessStartTime && Date.now() - businessStartTime.getTime() < onDemandCancellationTimeLimitMs) {
        return {
          action: EMeetingClosureAction.CANCEL_GRACE_PERIOD,
          reason: "On-demand appointment canceled within time limit",
        };
      }

      if (appointmentOrder || appointmentAdminInfo?.isInterpreterFound === false) {
        return {
          action: EMeetingClosureAction.CANCEL_NO_INTERPRETER,
          reason: "Interpreter was not found for on-demand appointment",
        };
      }
    } else if (schedulingType === EAppointmentSchedulingType.PRE_BOOKED) {
      if (
        meetingConfig.isInterpreterWasOnlineInBooking === false &&
        meetingConfig.isClientWasOnlineInBooking === true
      ) {
        return {
          action: EMeetingClosureAction.CANCEL_INTERPRETER_NO_SHOW,
          reason: "The interpreter did not show up for the pre-booked appointment.",
        };
      }
    }

    return { action: EMeetingClosureAction.CLOSE_NORMALLY };
  }

  private async handleMeetingCancellation(
    manager: EntityManager,
    meetingConfig: TChimeMeetingForClosure,
    cancellationReason: string,
  ): Promise<void> {
    await this.appointmentEndService.finalizeCancelledChimeVirtualAppointment(
      manager,
      meetingConfig.appointment,
      cancellationReason,
    );
  }

  private async handleMeetingClosure(manager: EntityManager, meetingConfig: TChimeMeetingForClosure): Promise<void> {
    if (
      !meetingConfig.mediaRegion ||
      !meetingConfig.mediaPipelineId ||
      !meetingConfig.appointment.appointmentAdminInfo
    ) {
      this.lokiLogger.error(
        `Meeting-config Id:${meetingConfig.id} not contains full information for closing, meetingConfig: ${JSON.stringify(meetingConfig)}`,
      );
      throw new BadRequestException(EChimeMeetingConfigurationErrorCodes.MEETING_CLOSING_INCOMPLETE_MEETING_INFO);
    }

    const recordingCallDirectory = await this.launchMediaConcatenationPipeline(
      meetingConfig.appointment.id,
      meetingConfig.mediaRegion,
      meetingConfig.mediaPipelineId,
    );

    await this.appointmentEndService.finalizeChimeVirtualAppointment(
      manager,
      meetingConfig.appointment,
      recordingCallDirectory,
    );
  }

  private async launchMediaConcatenationPipeline(
    appointmentId: string,
    mediaRegion: string,
    mediaPipelineId: string,
  ): Promise<string> {
    const { year, month, day } = getCurrentDateParts();
    const outputDirectoryForConcat = `${ERecordDirectory.ARCHIVE_RECORDS}/${year}/${month}/${day}/${appointmentId}`;
    const outputDirectory = `${ERecordDirectory.ARCHIVE_RECORDS}/${year}/${month}/${day}/${appointmentId}/${ERecordDirectory.AUDIO}`;

    this.chimeSdkService
      .createMediaConcatenationPipeline(mediaRegion, mediaPipelineId, outputDirectoryForConcat)
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to create media concatenation pipeline for appointmentId: ${appointmentId}`,
          error.stack,
        );
      });

    return outputDirectory;
  }

  private async deleteMeetingRelatedResources(meetingConfig: TChimeMeetingForClosure): Promise<void> {
    await this.deleteAwsChimeMeeting(meetingConfig);
    await this.appointmentSharedService.deleteChimeMeetingWithAttendees(meetingConfig);
  }

  public async deleteAwsChimeMeeting(meetingConfig: TChimeMeetingForClosure): Promise<void> {
    if (!meetingConfig.chimeMeetingId) {
      this.lokiLogger.error(`Chime meeting id not found for delete, meetingConfig: ${JSON.stringify(meetingConfig)}`);

      return;
    }

    await this.chimeSdkService.deleteMeeting(meetingConfig.chimeMeetingId);
  }
}

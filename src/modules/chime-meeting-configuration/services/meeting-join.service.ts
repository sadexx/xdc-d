import { InjectRepository } from "@nestjs/typeorm";
import { BadRequestException, ForbiddenException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { Repository } from "typeorm";
import { Attendee, ChimeMeetingConfiguration } from "src/modules/chime-meeting-configuration/entities";
import { AwsChimeSdkService } from "src/modules/aws/chime-sdk/aws-chime-sdk.service";
import { EAppointmentSchedulingType, EAppointmentStatus } from "src/modules/appointments/appointment/common/enums";
import { IMeetingAttendee } from "src/modules/chime-meeting-configuration/common/interfaces";
import { findOneOrFailTyped, isInRoles, isSameDay } from "src/common/utils";
import {
  COMPANY_ADMIN_ROLES,
  CLIENT_ROLES,
  INTERPRETER_ROLES,
  NUMBER_OF_MILLISECONDS_IN_MINUTE,
} from "src/common/constants";
import { AppointmentOrder } from "src/modules/appointment-orders/appointment-order/entities";
import { UserRole } from "src/modules/users/entities";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { LokiLogger } from "src/common/logger";
import {
  AttendeeManagementService,
  ChimeMeetingQueryOptionsService,
} from "src/modules/chime-meeting-configuration/services";
import { AppointmentOrderSharedLogicService } from "src/modules/appointment-orders/shared/services";
import { IJoinMeetingOutput } from "src/modules/chime-meeting-configuration/common/outputs";
import {
  TExternalUserMeetingConfig,
  TInternalUserMeetingConfig,
  TOnDemandMeetingConfig,
  TSuperAdminMeetingConfig,
  TMeetingConfigForSuperAdminJoin,
  TMeetingConfigForOnDemandJoin,
  TAppointmentForStatusCheck,
  TMeetingConfigForJoin,
  TAppointmentForBusinessStartTime,
} from "src/modules/chime-meeting-configuration/common/types";
import { EUserRoleName } from "src/modules/users/common/enums";
import { addMinutes } from "date-fns";
import { Appointment, AppointmentAdminInfo } from "src/modules/appointments/appointment/entities";
import { AppointmentSharedService } from "src/modules/appointments/shared/services";

@Injectable()
export class MeetingJoinService {
  private readonly lokiLogger = new LokiLogger(MeetingJoinService.name);
  constructor(
    @InjectRepository(ChimeMeetingConfiguration)
    private readonly chimeMeetingConfigurationRepository: Repository<ChimeMeetingConfiguration>,
    @InjectRepository(Attendee)
    private readonly attendeeRepository: Repository<Attendee>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(AppointmentAdminInfo)
    private readonly appointmentAdminInfoRepository: Repository<AppointmentAdminInfo>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly chimeSdkService: AwsChimeSdkService,
    private readonly appointmentOrderSharedLogicService: AppointmentOrderSharedLogicService,
    private readonly appointmentSharedService: AppointmentSharedService,
    private readonly chimeMeetingQueryService: ChimeMeetingQueryOptionsService,
    private readonly attendeeManagementService: AttendeeManagementService,
  ) {}

  public async joinMeetingAsSuperAdmin(
    appointmentId: string,
    currentUser: ITokenUserData,
  ): Promise<IJoinMeetingOutput> {
    try {
      const queryOptions = this.chimeMeetingQueryService.getSuperAdminMeetingConfigOptions(appointmentId);
      const meetingConfig = await findOneOrFailTyped<TSuperAdminMeetingConfig>(
        appointmentId,
        this.chimeMeetingConfigurationRepository,
        queryOptions,
      );

      if (!meetingConfig.mediaRegion || !meetingConfig.meeting) {
        this.lokiLogger.error(
          `Meeting in appointment Id:${meetingConfig.appointmentId} is not active, meetingConfig: ${JSON.stringify(meetingConfig)}`,
        );
        throw new BadRequestException("Meeting is not active");
      }

      await this.validateCorporateAdminMeetingAccess(meetingConfig as TMeetingConfigForSuperAdminJoin, currentUser);
      const attendeeResponse = await this.processSuperAdminJoinLogic(
        meetingConfig as TMeetingConfigForSuperAdminJoin,
        currentUser,
      );

      return {
        Meeting: meetingConfig.meeting,
        Attendee: {
          ...attendeeResponse,
        },
      };
    } catch (error) {
      this.lokiLogger.error(
        `Failed to join meeting as super admin: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new ServiceUnavailableException("Failed to join meeting");
    }
  }

  private async validateCorporateAdminMeetingAccess(
    meetingConfig: TMeetingConfigForSuperAdminJoin,
    currentUser: ITokenUserData,
  ): Promise<void> {
    if (isInRoles(COMPANY_ADMIN_ROLES, currentUser.role)) {
      const corporateAdmin = await findOneOrFailTyped<UserRole>(currentUser.userRoleId, this.userRoleRepository, {
        where: { id: currentUser.userRoleId },
      });

      if (
        meetingConfig.appointment.operatedByCompanyId !== corporateAdmin.operatedByCompanyId &&
        meetingConfig.appointment.operatedByCompanyName !== corporateAdmin.operatedByCompanyName
      ) {
        this.lokiLogger.warn(
          `User role with id: ${currentUser.userRoleId} attempted to join meeting without permission.`,
        );
        throw new BadRequestException("You do not have permission to join this meeting.");
      }
    }
  }

  private async processSuperAdminJoinLogic(
    meetingConfig: TMeetingConfigForSuperAdminJoin,
    currentUser: ITokenUserData,
  ): Promise<IMeetingAttendee> {
    const { appointment } = meetingConfig;
    const { appointmentAdminInfo, appointmentOrder } = appointment;
    await this.checkNeedToUpdateAppointmentStatus(appointment);

    if (appointmentAdminInfo && appointmentAdminInfo.isRedFlagEnabled) {
      await this.appointmentSharedService.disableRedFlag(appointment);
    }

    if (appointment.schedulingType === EAppointmentSchedulingType.ON_DEMAND && appointmentOrder) {
      await this.appointmentOrderSharedLogicService.removeAppointmentOrderBatch(appointmentOrder);
    }

    return await this.attendeeManagementService.addSuperAdminToLiveMeeting(meetingConfig, currentUser);
  }

  public async joinOnDemandMeeting(
    appointmentOrder: AppointmentOrder,
    interpreter: UserRole,
  ): Promise<IJoinMeetingOutput> {
    try {
      const queryOptions = this.chimeMeetingQueryService.getOnDemandMeetingConfigOptions(
        appointmentOrder.appointment.id,
      );
      const meetingConfig = await findOneOrFailTyped<TOnDemandMeetingConfig>(
        appointmentOrder.appointment.id,
        this.chimeMeetingConfigurationRepository,
        queryOptions,
      );

      if (!meetingConfig.mediaRegion || !meetingConfig.meeting || !meetingConfig.chimeMeetingId) {
        this.lokiLogger.error(
          `Meeting in appointment Id:${meetingConfig.appointmentId} is not active, meetingConfig: ${JSON.stringify(meetingConfig)}`,
        );
        throw new BadRequestException("Meeting is not active");
      }

      const attendeeResponse = await this.processOnDemandJoinLogic(
        meetingConfig as TMeetingConfigForOnDemandJoin,
        interpreter,
      );

      return {
        Meeting: meetingConfig.meeting,
        Attendee: {
          ...attendeeResponse,
        },
      };
    } catch (error) {
      this.lokiLogger.error(
        `Failed to join meeting as interpreter with id: ${interpreter.id}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new ServiceUnavailableException("Failed to join meeting");
    }
  }

  private async processOnDemandJoinLogic(
    meetingConfig: TMeetingConfigForOnDemandJoin,
    interpreter: UserRole,
  ): Promise<IMeetingAttendee> {
    await this.checkNeedToUpdateAppointmentStatus(meetingConfig.appointment);
    await this.setBusinessStartTime(meetingConfig.appointment, interpreter.role.name);

    return await this.attendeeManagementService.addInterpreterToOnDemandMeeting(meetingConfig, interpreter);
  }

  public async joinMeetingAsInternalUser(
    appointmentId: string,
    user: ITokenUserData,
    mediaRegion?: string,
  ): Promise<IJoinMeetingOutput> {
    const queryOptions = this.chimeMeetingQueryService.getInternalUserMeetingConfigOptions(
      appointmentId,
      user.userRoleId,
    );
    const meetingConfig = await findOneOrFailTyped<TInternalUserMeetingConfig>(
      appointmentId,
      this.chimeMeetingConfigurationRepository,
      queryOptions,
    );

    const joinMeetingResponse = await this.joinMeeting(meetingConfig, user.userRoleId, mediaRegion);
    await this.processInternalUserJoinLogic(meetingConfig, user);

    return joinMeetingResponse;
  }

  private async processInternalUserJoinLogic(
    meetingConfig: TInternalUserMeetingConfig,
    user: ITokenUserData,
  ): Promise<void> {
    await this.checkNeedToUpdateAppointmentStatus(meetingConfig.appointment);

    if (meetingConfig.appointment.schedulingType === EAppointmentSchedulingType.PRE_BOOKED) {
      await this.updateOnlinePresence(meetingConfig, user);
      await this.setBusinessStartTime(meetingConfig.appointment, user.role);
    }
  }

  public async joinMeetingAsExternalUser(
    appointmentId: string,
    externalUserId: string,
    mediaRegion?: string,
  ): Promise<IJoinMeetingOutput> {
    const queryOptions = this.chimeMeetingQueryService.getExternalUserMeetingConfigOptions(
      appointmentId,
      externalUserId,
    );
    const meetingConfig = await findOneOrFailTyped<TExternalUserMeetingConfig>(
      appointmentId,
      this.chimeMeetingConfigurationRepository,
      queryOptions,
    );

    const joinMeetingResponse = await this.joinMeeting(meetingConfig, externalUserId, mediaRegion);
    await this.checkNeedToUpdateAppointmentStatus(meetingConfig.appointment);

    return joinMeetingResponse;
  }

  private async updateOnlinePresence(meetingConfig: TInternalUserMeetingConfig, user: ITokenUserData): Promise<void> {
    if (!meetingConfig.appointment.appointmentAdminInfo) {
      this.lokiLogger.error(
        `Cannot update online status. Appointment admin info not found, meetingConfig: ${JSON.stringify(meetingConfig)}.`,
      );

      return;
    }

    if (isInRoles(CLIENT_ROLES, user.role) && [null, false].includes(meetingConfig.isClientWasOnlineInBooking)) {
      await this.updateClientOnlineMarking(meetingConfig.id, meetingConfig.appointment.appointmentAdminInfo.id);
    }

    if (
      isInRoles(INTERPRETER_ROLES, user.role) &&
      [null, false].includes(meetingConfig.isInterpreterWasOnlineInBooking)
    ) {
      await this.updateInterpreterOnlineMarking(meetingConfig.id, meetingConfig.appointment.appointmentAdminInfo.id);
    }
  }

  private async updateClientOnlineMarking(meetingConfigId: string, appointmentAdminInfoId: string): Promise<void> {
    await this.chimeMeetingConfigurationRepository.update(meetingConfigId, {
      isClientWasOnlineInBooking: true,
    });

    await this.appointmentAdminInfoRepository.update(appointmentAdminInfoId, {
      clientWasOnlineInBooking: new Date(),
    });
  }

  private async updateInterpreterOnlineMarking(meetingConfigId: string, appointmentAdminInfoId: string): Promise<void> {
    await this.chimeMeetingConfigurationRepository.update(meetingConfigId, {
      isInterpreterWasOnlineInBooking: true,
    });

    await this.appointmentAdminInfoRepository.update(appointmentAdminInfoId, {
      interpreterWasOnlineInBooking: new Date(),
    });
  }

  private async setBusinessStartTime(
    appointment: TAppointmentForBusinessStartTime,
    roleName: EUserRoleName,
  ): Promise<void> {
    if (!appointment.businessStartTime && isInRoles(INTERPRETER_ROLES, roleName)) {
      const scheduledStartTime = new Date(appointment.scheduledStartTime);
      const currentTime = new Date();
      let businessStartTime: Date;
      let internalEstimatedEndTime: Date | undefined;

      if (currentTime > scheduledStartTime) {
        businessStartTime = currentTime;
        internalEstimatedEndTime = addMinutes(currentTime, appointment.schedulingDurationMin);
      } else {
        businessStartTime = scheduledStartTime;
      }

      await this.updateBusinessStartTime(appointment.id, businessStartTime, internalEstimatedEndTime);
    }
  }

  private async updateBusinessStartTime(
    appointmentId: string,
    businessStartTime: Date,
    internalEstimatedEndTime?: Date,
  ): Promise<void> {
    const appointmentUpdateData: Partial<Appointment> = {
      businessStartTime: businessStartTime,
    };

    if (internalEstimatedEndTime) {
      appointmentUpdateData.internalEstimatedEndTime = internalEstimatedEndTime;
    }

    await this.appointmentRepository.update(appointmentId, appointmentUpdateData);
  }

  private async checkNeedToUpdateAppointmentStatus(appointment: TAppointmentForStatusCheck): Promise<void> {
    if (appointment.status !== EAppointmentStatus.LIVE) {
      await this.appointmentRepository.update(appointment.id, { status: EAppointmentStatus.LIVE });
    }
  }

  private async joinMeeting(
    meetingConfig: TMeetingConfigForJoin,
    userId: string,
    mediaRegion?: string,
  ): Promise<IJoinMeetingOutput> {
    const currentTime = new Date();
    let isMeetingExpired = false;

    await this.checkMeetingStartTime(currentTime, meetingConfig.meetingScheduledStartTime);

    if (!meetingConfig.meetingLaunchTime || !meetingConfig.chimeMeetingId) {
      const newMeetingConfig = await this.createNewMeeting(meetingConfig, mediaRegion);

      return await this.prepareMeetingResponse(newMeetingConfig, userId);
    }

    isMeetingExpired = await this.isMeetingExpired(currentTime, meetingConfig.meetingLaunchTime);

    if (!isMeetingExpired) {
      await this.checkIfRecordingHasStarted(meetingConfig);

      return await this.prepareMeetingResponse(meetingConfig, userId);
    }

    const availableMeeting = await this.chimeSdkService.getMeeting(meetingConfig.chimeMeetingId);

    if (availableMeeting) {
      await this.checkIfRecordingHasStarted(meetingConfig);

      return await this.prepareMeetingResponse(meetingConfig, userId);
    } else {
      const newMeetingConfig = await this.createNewMeeting(meetingConfig, mediaRegion);

      return await this.prepareMeetingResponse(newMeetingConfig, userId);
    }
  }

  private async checkMeetingStartTime(currentTime: Date, meetingScheduledStartTime: Date): Promise<void> {
    const earliestMeetingStartTimeMinutes = 5;
    const earliestStartTime = new Date(
      meetingScheduledStartTime.getTime() - earliestMeetingStartTimeMinutes * NUMBER_OF_MILLISECONDS_IN_MINUTE,
    );

    if (!isSameDay(currentTime, earliestStartTime)) {
      throw new ForbiddenException("Meeting can only be started on the same day as the scheduled start time.");
    }

    if (currentTime < earliestStartTime) {
      throw new ForbiddenException(
        "Meeting can only be started no more than 5 minutes before the scheduled start time.",
      );
    }
  }

  private async isMeetingExpired(currentTime: Date, meetingLaunchTime: Date): Promise<boolean> {
    const meetingExpirationTimeMinutes = 4;
    const meetingExpirationTime = new Date(
      meetingLaunchTime.getTime() + meetingExpirationTimeMinutes * NUMBER_OF_MILLISECONDS_IN_MINUTE,
    );

    return currentTime >= meetingExpirationTime;
  }

  private async createNewMeeting(
    meetingConfig: TMeetingConfigForJoin,
    mediaRegion?: string,
  ): Promise<TMeetingConfigForJoin> {
    const meetingResponse = await this.chimeSdkService.createMeetingWithAttendees(meetingConfig, mediaRegion);

    if (
      !meetingResponse.Meeting ||
      !meetingResponse.Meeting.MeetingId ||
      !meetingResponse.Meeting.MediaPlacement ||
      !meetingResponse.Meeting.MediaRegion ||
      !meetingResponse.Attendees
    ) {
      this.lokiLogger.error(
        `Failed to create meeting for appointment Id: ${meetingConfig.appointmentId}: ${JSON.stringify(meetingResponse)}`,
      );
      throw new ServiceUnavailableException("Unable to create meeting");
    }

    const attendeesResponse = meetingResponse.Attendees;
    meetingConfig.chimeMeetingId = meetingResponse.Meeting.MeetingId;
    meetingConfig.meetingLaunchTime = new Date();
    meetingConfig.mediaRegion = meetingResponse.Meeting.MediaRegion;
    meetingConfig.meeting = meetingResponse.Meeting;

    for (const attendee of meetingConfig.attendees) {
      const matchingResponse = attendeesResponse.find(
        (response) => response.ExternalUserId === attendee.externalUserId,
      );

      if (matchingResponse && matchingResponse.AttendeeId && matchingResponse.JoinToken) {
        attendee.attendeeId = matchingResponse.AttendeeId;
        attendee.joinToken = matchingResponse.JoinToken;
      }

      if (!attendee.attendeeId || !attendee.joinToken) {
        this.lokiLogger.error(
          `Failed to create attendee for appointment Id: ${meetingConfig.appointmentId}, attendee: ${JSON.stringify(attendee)}`,
        );
        throw new ServiceUnavailableException("Unable to create attendee");
      }
    }

    await this.chimeMeetingConfigurationRepository.update(meetingConfig.id, {
      chimeMeetingId: meetingConfig.chimeMeetingId,
      meetingLaunchTime: meetingConfig.meetingLaunchTime,
      mediaRegion: meetingConfig.mediaRegion,
      meeting: meetingConfig.meeting,
    });
    await this.attendeeRepository.save(meetingConfig.attendees);
    await this.startMediaCapturePipeline(meetingConfig);

    return meetingConfig;
  }

  private async checkIfRecordingHasStarted(meetingConfig: TMeetingConfigForJoin): Promise<void> {
    if (!meetingConfig.callRecordingEnabled) {
      await this.startMediaCapturePipeline(meetingConfig);
    }
  }

  private async startMediaCapturePipeline(meetingConfig: TMeetingConfigForJoin): Promise<void> {
    if (!meetingConfig.chimeMeetingId) {
      this.lokiLogger.error(`Chime meeting id not found, meetingConfig: ${JSON.stringify(meetingConfig)}`);
      throw new BadRequestException("Chime meeting id not found");
    }

    const pipeline = await this.chimeSdkService.startMediaCapturePipeline(meetingConfig.chimeMeetingId);

    if (!pipeline || !pipeline.MediaCapturePipeline) {
      this.lokiLogger.error(`Failed to start media capture pipeline, pipeline: ${JSON.stringify(pipeline)}`);
      throw new ServiceUnavailableException("Failed to join meeting");
    }

    await this.chimeMeetingConfigurationRepository.update(meetingConfig.id, {
      callRecordingEnabled: true,
      mediaPipelineId: pipeline.MediaCapturePipeline.MediaPipelineId,
    });
  }

  private async prepareMeetingResponse(
    meetingConfig: TMeetingConfigForJoin,
    userId: string,
  ): Promise<IJoinMeetingOutput> {
    const currentAttendee = meetingConfig.attendees.find((attendee) => attendee.externalUserId === userId);

    if (!currentAttendee || !meetingConfig.chimeMeetingId || !meetingConfig.mediaRegion || !meetingConfig.meeting) {
      this.lokiLogger.error(`Unable to join meeting: ${JSON.stringify(meetingConfig)}`);
      throw new ServiceUnavailableException("Unable to join meeting");
    }

    await this.attendeeRepository.update(currentAttendee.id, {
      isOnline: true,
    });

    return {
      Meeting: meetingConfig.meeting,
      Attendee: { ...currentAttendee, isOnline: true },
    };
  }
}

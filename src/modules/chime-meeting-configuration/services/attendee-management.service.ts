import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Attendee, ChimeMeetingConfiguration } from "src/modules/chime-meeting-configuration/entities";
import { AwsChimeSdkService } from "src/modules/aws/chime-sdk/aws-chime-sdk.service";
import {
  IInvitedInternalUser,
  IInvitedParticipant,
  IMeetingAttendee,
} from "src/modules/chime-meeting-configuration/common/interfaces";
import { EUserRoleName } from "src/modules/users/common/enums";
import { MultiWayParticipant } from "src/modules/multi-way-participant/entities";
import { UserRole } from "src/modules/users/entities";
import {
  AttendeeCreationService,
  ChimeMeetingQueryOptionsService,
} from "src/modules/chime-meeting-configuration/services";
import { AttendeeCapabilities, AttendeeIdItem } from "@aws-sdk/client-chime-sdk-meetings";
import { findOneOrFailTyped, isInRoles } from "src/common/utils";
import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { LokiLogger } from "src/common/logger";
import {
  EExternalVideoResolution,
  EExtMediaCapabilities,
  EExtVideoContentResolution,
} from "src/modules/chime-meeting-configuration/common/enums";
import { IMessageOutput } from "src/common/outputs";
import {
  AdminUpdateAttendeeCapabilitiesDto,
  UpdateAttendeeCapabilitiesDto,
} from "src/modules/chime-meeting-configuration/common/dto";
import {
  CLIENT_ROLES,
  COMPANY_ADMIN_ROLES,
  UNDEFINED_VALUE,
  INTERPRETER_ROLES,
  LFH_ADMIN_ROLES,
} from "src/common/constants";
import { IAttendeeDetailsOutput } from "src/modules/chime-meeting-configuration/common/outputs";
import { TAcceptAppointmentOrder } from "src/modules/appointment-orders/appointment-order/common/types";
import {
  TMeetingConfigForOnDemandJoin,
  TAttendeeByExternalUserId,
  TAttendeeDetails,
  TAttendeeDetailsMultiWayParticipant,
  TAttendeeDetailsUserRole,
  TBatchUpdateAttendeeCapabilities,
  TChimeMeetingConfigUpdate,
  TAddExtraAttendeeInLiveMeeting,
  TMeetingConfigAndAttendees,
  TMeetingConfigForClientPstnCalls,
  TUpdateAttendeeCapabilities,
  TMeetingConfigForSuperAdminJoin,
  TAttendeeRemovalConfig,
  TMeetingConfigForAttendeeCreation,
} from "src/modules/chime-meeting-configuration/common/types";
import { TChimeMeetingConfigForParticipant } from "src/modules/multi-way-participant/common/types";

@Injectable()
export class AttendeeManagementService {
  private readonly lokiLogger = new LokiLogger(AttendeeManagementService.name);
  private readonly DEFAULT_ANONYMOUS_GUEST: number = 5;
  private readonly DEFAULT_ANONYMOUS_GUEST_NAME: string = "Anonymous Guest";

  constructor(
    @InjectRepository(ChimeMeetingConfiguration)
    private readonly chimeMeetingConfigurationRepository: Repository<ChimeMeetingConfiguration>,
    @InjectRepository(Attendee)
    private readonly attendeeRepository: Repository<Attendee>,
    @InjectRepository(MultiWayParticipant)
    private readonly multiWayParticipantRepository: Repository<MultiWayParticipant>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly attendeeCreationService: AttendeeCreationService,
    private readonly chimeSdkService: AwsChimeSdkService,
    private readonly chimeMeetingQueryService: ChimeMeetingQueryOptionsService,
  ) {}

  public async getConfigAndAttendeesByAppointmentId(appointmentId: string): Promise<TMeetingConfigAndAttendees> {
    const queryOptions = this.chimeMeetingQueryService.getMeetingConfigAndAttendeesOptions(appointmentId);

    return await findOneOrFailTyped<TMeetingConfigAndAttendees>(
      appointmentId,
      this.chimeMeetingConfigurationRepository,
      queryOptions,
    );
  }

  public async getAttendeeAndDetails(chimeMeetingId: string, attendeeId: string): Promise<IAttendeeDetailsOutput> {
    const awsAttendee = await this.chimeSdkService.getAttendee(chimeMeetingId, attendeeId);
    const customAttendeeDetails = await this.getAttendeeAndDetailsFromDb(chimeMeetingId, attendeeId);

    return {
      Attendee: awsAttendee,
      attendeeDetails: customAttendeeDetails,
    };
  }

  public async getAttendeeAndDetailsFromDb(
    chimeMeetingId: string,
    attendeeId: string,
  ): Promise<IInvitedInternalUser | IInvitedParticipant> {
    const queryOptions = this.chimeMeetingQueryService.getAttendeeDetailsOptions(chimeMeetingId, attendeeId);
    const customAttendeeDetails = await findOneOrFailTyped<TAttendeeDetails>(
      attendeeId,
      this.attendeeRepository,
      queryOptions,
    );

    if (customAttendeeDetails.isAnonymousGuest) {
      return {
        id: customAttendeeDetails.attendeeId,
        name: this.DEFAULT_ANONYMOUS_GUEST_NAME,
        role: { name: EUserRoleName.INVITED_GUEST },
      } as IInvitedParticipant;
    }

    if (customAttendeeDetails.roleName === EUserRoleName.INVITED_GUEST && !customAttendeeDetails.isAnonymousGuest) {
      const participantQueryOptions = this.chimeMeetingQueryService.getAttendeeDetailsMultiWayParticipantOptions(
        customAttendeeDetails.externalUserId,
      );
      const participant = await findOneOrFailTyped<TAttendeeDetailsMultiWayParticipant>(
        customAttendeeDetails.externalUserId,
        this.multiWayParticipantRepository,
        participantQueryOptions,
      );

      return {
        id: participant.id,
        name: participant.name,
        role: { name: EUserRoleName.INVITED_GUEST },
      } as IInvitedParticipant;
    } else {
      const userRoleQueryOptions = this.chimeMeetingQueryService.getAttendeeDetailsUserRoleOptions(
        customAttendeeDetails.externalUserId,
      );
      const internalUser = await findOneOrFailTyped<TAttendeeDetailsUserRole>(
        customAttendeeDetails.externalUserId,
        this.userRoleRepository,
        userRoleQueryOptions,
      );

      return internalUser as IInvitedInternalUser;
    }
  }

  public async batchUpdateAttendeeCapabilities(
    chimeMeetingId: string,
    dto: AdminUpdateAttendeeCapabilitiesDto,
    user: ITokenUserData,
  ): Promise<IMessageOutput> {
    const queryOptions = this.chimeMeetingQueryService.getBatchUpdateAttendeeCapabilitiesOptions(
      chimeMeetingId,
      user.userRoleId,
    );
    const meetingConfig = await findOneOrFailTyped<TBatchUpdateAttendeeCapabilities>(
      chimeMeetingId,
      this.chimeMeetingConfigurationRepository,
      queryOptions,
    );

    if (meetingConfig.attendees.length === 0) {
      throw new BadRequestException("No attendees found for this meeting.");
    }

    await this.verifyMeetingConfigCapabilities(meetingConfig, dto);
    const adminAttendees = meetingConfig.attendees.filter((attendee) => isInRoles(LFH_ADMIN_ROLES, attendee.roleName));

    const adminAttendeeIds: AttendeeIdItem[] = adminAttendees.map((attendee) => ({
      AttendeeId: attendee.attendeeId,
    }));
    await this.chimeSdkService.updateAttendeesCapabilitiesExcept(
      meetingConfig.chimeMeetingId as string,
      adminAttendeeIds,
      {
        Audio: dto.audioCapabilities,
        Video: dto.videoCapabilities,
        Content: dto.contentCapabilities,
      },
    );

    const nonAdminAttendees = meetingConfig.attendees.filter(
      (attendee) => !isInRoles(LFH_ADMIN_ROLES, attendee.roleName),
    );
    const nonAdminAttendeeIds = nonAdminAttendees.map((attendee) => attendee.id);
    await this.attendeeRepository.update(nonAdminAttendeeIds, {
      audioCapabilities: dto.audioCapabilities,
      videoCapabilities: dto.videoCapabilities,
      contentCapabilities: dto.contentCapabilities,
    });

    return { message: "Attendee capabilities updated successfully." };
  }

  public async updateAttendeeCapabilities(
    chimeMeetingId: string,
    dto: UpdateAttendeeCapabilitiesDto,
    user: ITokenUserData,
  ): Promise<IMessageOutput> {
    const queryOptions = this.chimeMeetingQueryService.getUpdateAttendeeCapabilitiesOptions(
      chimeMeetingId,
      dto.attendeeId,
    );
    const meetingConfig = await findOneOrFailTyped<TUpdateAttendeeCapabilities>(
      chimeMeetingId,
      this.chimeMeetingConfigurationRepository,
      queryOptions,
      "chimeMeetingId",
    );

    await this.verifyMeetingConfigCapabilities(meetingConfig, dto);
    const [attendee] = meetingConfig.attendees;
    await this.verifyRolePermissionsForUpdateCapabilities(attendee.roleName, user);

    await this.chimeSdkService.updateAttendeeCapabilities(meetingConfig.chimeMeetingId as string, attendee.attendeeId, {
      Audio: dto.audioCapabilities,
      Video: dto.videoCapabilities,
      Content: dto.contentCapabilities,
    });
    await this.attendeeRepository.update(attendee.id, {
      audioCapabilities: dto.audioCapabilities,
      videoCapabilities: dto.videoCapabilities,
      contentCapabilities: dto.contentCapabilities,
    });

    return { message: "Attendee capabilities updated successfully." };
  }

  public async addInterpreterToPreBookedMeeting(
    appointmentOrder: TAcceptAppointmentOrder,
    interpreter: UserRole,
  ): Promise<IMessageOutput> {
    const queryOptions = this.chimeMeetingQueryService.getChimeMeetingConfigUpdateOptions(
      appointmentOrder.appointment.id,
    );
    const meetingConfig = await findOneOrFailTyped<TChimeMeetingConfigUpdate>(
      appointmentOrder.appointment.id,
      this.chimeMeetingConfigurationRepository,
      queryOptions,
      "appointmentId",
    );

    await this.attendeeCreationService.addAttendeeToPreBookedMeeting({
      meetingConfig: { ...meetingConfig, appointment: appointmentOrder.appointment },
      userId: interpreter.id,
      roleName: interpreter.role.name,
    });

    return { message: "Accepted successfully." };
  }

  public async addNewAttendeeToPreBookedMeeting(
    meetingConfig: TChimeMeetingConfigForParticipant,
    participant: MultiWayParticipant,
  ): Promise<Attendee> {
    return await this.attendeeCreationService.addAttendeeToPreBookedMeeting({
      meetingConfig,
      userId: participant.id,
      roleName: EUserRoleName.INVITED_GUEST,
      guestPhoneNumber:
        participant.phoneCode && participant.phoneNumber
          ? participant.phoneCode + participant.phoneNumber
          : UNDEFINED_VALUE,
    });
  }

  public async addSuperAdminToLiveMeeting(
    meetingConfig: TMeetingConfigForSuperAdminJoin,
    currentUser: ITokenUserData,
  ): Promise<IMeetingAttendee> {
    return this.addAttendeeToLiveMeeting({
      meetingConfig,
      userId: currentUser.userRoleId,
      roleName: currentUser.role,
    });
  }

  public async addInterpreterToOnDemandMeeting(
    meetingConfig: TMeetingConfigForOnDemandJoin,
    interpreter: UserRole,
  ): Promise<IMeetingAttendee> {
    return this.addAttendeeToLiveMeeting({
      meetingConfig,
      userId: interpreter.id,
      roleName: interpreter.role.name,
    });
  }

  public async addExtraAttendeeInLiveMeeting(
    chimeMeetingId: string,
    user: ITokenUserData,
  ): Promise<{
    joinUrl: string;
  }> {
    const maxAttendeesQueryOptions =
      await this.chimeMeetingQueryService.getAnonymousAttendeeCountOptions(chimeMeetingId);
    const maxAttendees = await this.attendeeRepository.count(maxAttendeesQueryOptions);

    if (maxAttendees >= this.DEFAULT_ANONYMOUS_GUEST) {
      throw new BadRequestException(`Maximum ${this.DEFAULT_ANONYMOUS_GUEST} anonymous guests allowed`);
    }

    const queryOptions = this.chimeMeetingQueryService.getAddExtraAttendeeInLiveMeetingOptions(
      chimeMeetingId,
      user.userRoleId,
    );
    const meetingConfig = await findOneOrFailTyped<TAddExtraAttendeeInLiveMeeting>(
      chimeMeetingId,
      this.chimeMeetingConfigurationRepository,
      queryOptions,
    );

    const attendeeExternalId = randomUUID();
    const attendee = await this.addAttendeeToLiveMeeting({
      meetingConfig: meetingConfig as TMeetingConfigForAttendeeCreation,
      userId: attendeeExternalId,
      roleName: EUserRoleName.INVITED_GUEST,
    });

    return {
      joinUrl: attendee.joinUrl,
    };
  }

  public async addPstnParticipantToLiveMeeting(
    meetingConfig: TMeetingConfigForClientPstnCalls,
    phoneNumber: string,
  ): Promise<IMeetingAttendee> {
    return await this.addAttendeeToLiveMeeting({
      meetingConfig: meetingConfig as TMeetingConfigForAttendeeCreation,
      userId: randomUUID(),
      roleName: EUserRoleName.INVITED_GUEST,
      guestPhoneNumber: phoneNumber,
    });
  }

  public async disableAttendeeInMeeting(
    chimeMeetingId: string,
    attendeeId: string,
    user: ITokenUserData,
  ): Promise<IMessageOutput> {
    const queryOptions = this.chimeMeetingQueryService.getUpdateAttendeeCapabilitiesOptions(chimeMeetingId, attendeeId);
    const meetingConfig = await findOneOrFailTyped<TUpdateAttendeeCapabilities>(
      chimeMeetingId,
      this.chimeMeetingConfigurationRepository,
      queryOptions,
      "chimeMeetingId",
    );
    const [attendee] = meetingConfig.attendees;

    if (isInRoles(LFH_ADMIN_ROLES, attendee.roleName) || isInRoles(CLIENT_ROLES, attendee.roleName)) {
      throw new BadRequestException("You cannot disable admin or client from the meeting.");
    }

    await this.verifyRolePermissionsForDisable(attendee.roleName, user);
    await this.chimeSdkService.deleteAttendee(meetingConfig.chimeMeetingId as string, attendee.attendeeId);

    await this.attendeeRepository.delete(attendee.id);

    return { message: "Attendee disabled successfully." };
  }

  public async deleteAttendeeByExternalUserId(
    meetingConfig: TAttendeeRemovalConfig,
    externalUserId: string,
  ): Promise<void> {
    const queryOptions = this.chimeMeetingQueryService.getAttendeeByExternalUserIdOptions(
      meetingConfig.id,
      externalUserId,
    );
    const attendee = await findOneOrFailTyped<TAttendeeByExternalUserId>(
      externalUserId,
      this.attendeeRepository,
      queryOptions,
    );

    await this.attendeeRepository.delete(attendee.id);
    await this.chimeMeetingConfigurationRepository.update(meetingConfig.id, {
      maxAttendees: meetingConfig.maxAttendees - 1,
    });
  }

  private async verifyMeetingConfigCapabilities(
    meetingConfig: TBatchUpdateAttendeeCapabilities | TUpdateAttendeeCapabilities,
    dto: AdminUpdateAttendeeCapabilitiesDto | UpdateAttendeeCapabilitiesDto,
  ): Promise<void> {
    if (
      meetingConfig.maxVideoResolution === EExternalVideoResolution.NONE &&
      dto.videoCapabilities !== EExtMediaCapabilities.NONE
    ) {
      throw new BadRequestException("Video capabilities must be set to None for a meeting that does not support video");
    }

    if (
      meetingConfig.maxContentResolution === EExtVideoContentResolution.NONE &&
      dto.contentCapabilities !== EExtMediaCapabilities.NONE
    ) {
      throw new BadRequestException(
        "Content sharing capabilities must be set to None for a meeting that does not support content sharing",
      );
    }
  }

  private async verifyRolePermissionsForUpdateCapabilities(
    attendeeRoleName: EUserRoleName,
    user: ITokenUserData,
  ): Promise<void> {
    if (isInRoles(LFH_ADMIN_ROLES, attendeeRoleName)) {
      throw new BadRequestException("You cannot update admin attendee capabilities.");
    }

    if (isInRoles(COMPANY_ADMIN_ROLES, user.role) && isInRoles(COMPANY_ADMIN_ROLES, attendeeRoleName)) {
      throw new BadRequestException("You cannot update admin attendee capabilities.");
    }

    if (isInRoles(CLIENT_ROLES, user.role) && isInRoles(COMPANY_ADMIN_ROLES, attendeeRoleName)) {
      throw new BadRequestException("You cannot update admin attendee capabilities.");
    }

    if (isInRoles(CLIENT_ROLES, user.role) && isInRoles(CLIENT_ROLES, attendeeRoleName)) {
      throw new BadRequestException("You cannot update your own capabilities.");
    }
  }

  private async verifyRolePermissionsForDisable(attendeeRoleName: EUserRoleName, user: ITokenUserData): Promise<void> {
    if (isInRoles(LFH_ADMIN_ROLES, attendeeRoleName)) {
      throw new BadRequestException("You cannot disable admin attendee.");
    }

    if (isInRoles(COMPANY_ADMIN_ROLES, user.role) && isInRoles(COMPANY_ADMIN_ROLES, attendeeRoleName)) {
      throw new BadRequestException("You cannot disable admin attendee.");
    }

    if (isInRoles(CLIENT_ROLES, user.role) && isInRoles(COMPANY_ADMIN_ROLES, attendeeRoleName)) {
      throw new BadRequestException("You cannot disable admin attendee.");
    }

    if (isInRoles(CLIENT_ROLES, attendeeRoleName)) {
      throw new BadRequestException("You cannot disable client attendee.");
    }
  }

  private async addAttendeeToLiveMeeting(params: {
    meetingConfig: TMeetingConfigForAttendeeCreation;
    userId: string;
    roleName: EUserRoleName;
    guestPhoneNumber?: string;
  }): Promise<IMeetingAttendee> {
    const { meetingConfig, userId, roleName, guestPhoneNumber } = params;

    const chimeAttendeeCapabilities = await this.determineAttendeeCapabilitiesAndConvert(meetingConfig.appointment);
    const attendeeDto = await this.attendeeCreationService.constructAttendeeDto(
      meetingConfig,
      userId,
      roleName,
      {
        audioCapabilities: chimeAttendeeCapabilities.Audio as EExtMediaCapabilities,
        videoCapabilities: chimeAttendeeCapabilities.Video as EExtMediaCapabilities,
        contentCapabilities: chimeAttendeeCapabilities.Content as EExtMediaCapabilities,
      },
      guestPhoneNumber,
    );

    const attendeeResponse = await this.instantAddAttendeeToLiveMeeting(
      meetingConfig.chimeMeetingId,
      userId,
      roleName,
      chimeAttendeeCapabilities,
    );
    const isAnonymousGuest = roleName === EUserRoleName.INVITED_GUEST ? true : false;
    const isOnline = this.determineAttendeeOnlineStatus(roleName, guestPhoneNumber);
    await this.attendeeCreationService.createAttendees([
      {
        ...attendeeDto,
        attendeeId: attendeeResponse.attendeeId,
        joinToken: attendeeResponse.joinToken,
        isAnonymousGuest: isAnonymousGuest,
        isOnline: isOnline,
      },
    ]);

    return {
      ...attendeeResponse,
      joinUrl: attendeeDto.joinUrl,
      isAnonymousGuest: isAnonymousGuest,
      isOnline: isOnline,
    };
  }

  private async determineAttendeeCapabilitiesAndConvert(
    appointment: TMeetingConfigForAttendeeCreation["appointment"],
  ): Promise<AttendeeCapabilities> {
    const capabilities = await this.attendeeCreationService.determineAttendeeCapabilities(
      appointment.id,
      appointment.communicationType,
    );

    const chimeAttendeeCapabilities: AttendeeCapabilities = {
      Audio: capabilities.audioCapabilities,
      Video: capabilities.videoCapabilities,
      Content: capabilities.contentCapabilities,
    };

    return chimeAttendeeCapabilities;
  }

  private async instantAddAttendeeToLiveMeeting(
    chimeMeetingId: string,
    userRoleId: string,
    userRoleName: EUserRoleName,
    capabilities: AttendeeCapabilities,
  ): Promise<Omit<IMeetingAttendee, "joinUrl">> {
    const attendeeResponse = await this.chimeSdkService.createAttendee(chimeMeetingId, userRoleId, capabilities);

    if (
      !attendeeResponse.Attendee ||
      !attendeeResponse.Attendee.ExternalUserId ||
      !attendeeResponse.Attendee.AttendeeId ||
      !attendeeResponse.Attendee.JoinToken ||
      !attendeeResponse.Attendee.Capabilities ||
      !attendeeResponse.Attendee.Capabilities.Audio ||
      !attendeeResponse.Attendee.Capabilities.Video ||
      !attendeeResponse.Attendee.Capabilities.Content
    ) {
      this.lokiLogger.error(
        `Failed to instant add attendee to live meeting. Response:${JSON.stringify(attendeeResponse)}`,
      );
      throw new ServiceUnavailableException("Unable to join meeting");
    }

    return {
      id: attendeeResponse.Attendee.AttendeeId,
      externalUserId: attendeeResponse.Attendee.ExternalUserId,
      roleName: userRoleName,
      attendeeId: attendeeResponse.Attendee.AttendeeId,
      isOnline: false,
      isAnonymousGuest: false,
      guestPhoneNumber: null,
      joinToken: attendeeResponse.Attendee.JoinToken,
      audioCapabilities: attendeeResponse.Attendee.Capabilities.Audio as EExtMediaCapabilities,
      videoCapabilities: attendeeResponse.Attendee.Capabilities.Video as EExtMediaCapabilities,
      contentCapabilities: attendeeResponse.Attendee.Capabilities.Content as EExtMediaCapabilities,
    };
  }

  private determineAttendeeOnlineStatus(roleName: EUserRoleName, guestPhoneNumber?: string): boolean {
    if (isInRoles([...LFH_ADMIN_ROLES, ...INTERPRETER_ROLES], roleName)) {
      return true;
    }

    if (roleName === EUserRoleName.INVITED_GUEST && guestPhoneNumber) {
      return true;
    }

    return false;
  }
}

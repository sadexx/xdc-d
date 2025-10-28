import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AwsChimeSdkService } from "src/modules/aws/chime-sdk/aws-chime-sdk.service";
import { Repository } from "typeorm";
import { ChimeMeetingConfiguration } from "src/modules/chime-meeting-configuration/entities";
import { CreateBackgroundCallDto, CreateCallRequestDto } from "src/modules/chime-meeting-configuration/common/dto";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { LokiLogger } from "src/common/logger";
import { IMessageOutput } from "src/common/outputs";
import { findOneOrFailTyped, isInRoles } from "src/common/utils";
import {
  AttendeeManagementService,
  ChimeMeetingQueryOptionsService,
} from "src/modules/chime-meeting-configuration/services";
import {
  EBackgroundCallType,
  EChimeMeetingConfigurationErrorCodes,
} from "src/modules/chime-meeting-configuration/common/enums";
import { CLIENT_ROLES, INTERPRETER_ROLES } from "src/common/constants";
import {
  TMeetingConfigByChimeMeetingId,
  TMeetingConfigByClient,
  TMeetingConfigByInterpreter,
  TMeetingConfigForClientPstnCalls,
  TMeetingConfigForParticipants,
} from "src/modules/chime-meeting-configuration/common/types";

@Injectable()
export class SipMediaService {
  private readonly lokiLogger = new LokiLogger(SipMediaService.name);
  private readonly TEMPORARY_PHONE_NUMBER: string = "+14582464706";
  private readonly MAX_PSTN_CALLS_FOR_CLIENT: number = 3;

  constructor(
    @InjectRepository(ChimeMeetingConfiguration)
    private readonly chimeMeetingConfigurationRepository: Repository<ChimeMeetingConfiguration>,
    private readonly chimeSdkService: AwsChimeSdkService,
    private readonly chimeMeetingQueryService: ChimeMeetingQueryOptionsService,
    private readonly attendeeManagementService: AttendeeManagementService,
  ) {}

  public async createSipMediaApplicationCallAsReceptionist(
    chimeMeetingId: string,
    dto: CreateCallRequestDto,
  ): Promise<IMessageOutput> {
    const queryOptions = this.chimeMeetingQueryService.getMeetingConfigByChimeMeetingIdOptions(chimeMeetingId);
    const meetingConfig = await findOneOrFailTyped<TMeetingConfigByChimeMeetingId>(
      chimeMeetingId,
      this.chimeMeetingConfigurationRepository,
      queryOptions,
    );

    if (!meetingConfig.chimeMeetingId || !meetingConfig.meetingLaunchTime) {
      throw new BadRequestException(EChimeMeetingConfigurationErrorCodes.SIP_MEDIA_MEETING_NOT_STARTED);
    }

    const attendee = await this.attendeeManagementService.addPstnParticipantToLiveMeeting(
      meetingConfig,
      dto.toPhoneNumber,
    );
    const fromPhoneNumber = this.TEMPORARY_PHONE_NUMBER;
    await this.chimeSdkService.createSipMediaApplicationCall(
      fromPhoneNumber,
      dto.toPhoneNumber,
      meetingConfig.chimeMeetingId,
      attendee.attendeeId,
    );

    return { message: "Successfully created call" };
  }

  public async createBackgroundCall(
    chimeMeetingId: string,
    dto: CreateBackgroundCallDto,
    user: ITokenUserData,
  ): Promise<IMessageOutput> {
    if (isInRoles(CLIENT_ROLES, user.role) && dto.callType === EBackgroundCallType.CALL_TO_INTERPRETER) {
      return await this.createSipMediaApplicationCallToInterpreter(chimeMeetingId, user);
    }

    if (isInRoles(INTERPRETER_ROLES, user.role) && dto.callType === EBackgroundCallType.CALL_TO_CLIENT) {
      return await this.createSipMediaApplicationCallToClient(chimeMeetingId, user);
    }

    if (isInRoles(CLIENT_ROLES, user.role) && dto.callType === EBackgroundCallType.CALL_TO_EXTERNAL_PARTICIPANTS) {
      if (!dto.inActiveAttendeeIds || dto.inActiveAttendeeIds.length === 0) {
        throw new BadRequestException(EChimeMeetingConfigurationErrorCodes.SIP_MEDIA_ATTENDEE_IDS_REQUIRED);
      }

      return await this.createSipMediaApplicationCallForParticipants(chimeMeetingId, dto.inActiveAttendeeIds, user);
    }

    throw new BadRequestException(EChimeMeetingConfigurationErrorCodes.SIP_MEDIA_INVALID_CALL_TYPE);
  }

  private async createSipMediaApplicationCallToInterpreter(
    chimeMeetingId: string,
    user: ITokenUserData,
  ): Promise<IMessageOutput> {
    const queryOptions = this.chimeMeetingQueryService.getMeetingConfigByClientOptions(chimeMeetingId, user.userRoleId);
    const meetingConfig = await findOneOrFailTyped<TMeetingConfigByClient>(
      chimeMeetingId,
      this.chimeMeetingConfigurationRepository,
      queryOptions,
    );

    if (!meetingConfig.appointment.interpreter || !meetingConfig.appointment.interpreter.user.phoneNumber) {
      throw new BadRequestException(EChimeMeetingConfigurationErrorCodes.SIP_MEDIA_INTERPRETER_INFO_NOT_FOUND);
    }

    if (!meetingConfig.chimeMeetingId || !meetingConfig.meetingLaunchTime) {
      throw new BadRequestException(EChimeMeetingConfigurationErrorCodes.SIP_MEDIA_MEETING_NOT_STARTED);
    }

    const [interpreterAttendee] = meetingConfig.attendees;
    const attendeeId: string | null = interpreterAttendee.attendeeId ?? "";
    const interpreterPhoneNumber = meetingConfig.appointment.interpreter.user.phoneNumber;

    const fromPhoneNumber = this.TEMPORARY_PHONE_NUMBER;
    await this.chimeSdkService.createSipMediaApplicationCall(
      fromPhoneNumber,
      interpreterPhoneNumber,
      chimeMeetingId,
      attendeeId,
    );

    return { message: "Successfully created call" };
  }

  private async createSipMediaApplicationCallToClient(
    chimeMeetingId: string,
    user: ITokenUserData,
  ): Promise<IMessageOutput> {
    const queryOptions = this.chimeMeetingQueryService.getMeetingConfigByInterpreterOptions(
      chimeMeetingId,
      user.userRoleId,
    );
    const meetingConfig = await findOneOrFailTyped<TMeetingConfigByInterpreter>(
      chimeMeetingId,
      this.chimeMeetingConfigurationRepository,
      queryOptions,
    );

    if (!meetingConfig.appointment.client || !meetingConfig.appointment.client.user.phoneNumber) {
      throw new BadRequestException(EChimeMeetingConfigurationErrorCodes.SIP_MEDIA_CLIENT_INFO_NOT_FOUND);
    }

    if (!meetingConfig.chimeMeetingId || !meetingConfig.meetingLaunchTime) {
      throw new BadRequestException(EChimeMeetingConfigurationErrorCodes.SIP_MEDIA_MEETING_NOT_STARTED);
    }

    const [clientAttendee] = meetingConfig.attendees;
    const attendeeId = clientAttendee.attendeeId ?? "";
    const clientPhoneNumber = meetingConfig.appointment.client.user.phoneNumber;

    const fromPhoneNumber = this.TEMPORARY_PHONE_NUMBER;
    await this.chimeSdkService.createSipMediaApplicationCall(
      fromPhoneNumber,
      clientPhoneNumber,
      chimeMeetingId,
      attendeeId,
    );

    return { message: "Successfully created call" };
  }

  private async createSipMediaApplicationCallForParticipants(
    chimeMeetingId: string,
    inActiveAttendeeIds: string[],
    user: ITokenUserData,
  ): Promise<IMessageOutput> {
    const queryOptions = this.chimeMeetingQueryService.getMeetingConfigForParticipantsOptions(
      chimeMeetingId,
      user.userRoleId,
    );
    const meetingConfig = await findOneOrFailTyped<TMeetingConfigForParticipants>(
      chimeMeetingId,
      this.chimeMeetingConfigurationRepository,
      queryOptions,
    );

    if (!meetingConfig.chimeMeetingId || !meetingConfig.meetingLaunchTime) {
      throw new BadRequestException(EChimeMeetingConfigurationErrorCodes.SIP_MEDIA_MEETING_NOT_STARTED);
    }

    const inActiveAttendeeIdsSet = new Set(inActiveAttendeeIds);
    const attendeesToCall = meetingConfig.attendees.filter(
      (attendee) => attendee.guestPhoneNumber && inActiveAttendeeIdsSet.has(attendee.attendeeId),
    );

    if (attendeesToCall.length === 0) {
      return { message: "No attendees to call" };
    }

    await this.createMultipleSipCalls(chimeMeetingId, attendeesToCall);

    return { message: "Successfully created calls" };
  }

  public async createSipMediaApplicationCallAsClient(
    chimeMeetingId: string,
    dto: CreateCallRequestDto,
    user: ITokenUserData,
  ): Promise<{ message: string }> {
    const queryOptions = this.chimeMeetingQueryService.getMeetingConfigForClientPstnCallsOptions(
      chimeMeetingId,
      user.userRoleId,
    );
    const meetingConfig = await findOneOrFailTyped<TMeetingConfigForClientPstnCalls>(
      chimeMeetingId,
      this.chimeMeetingConfigurationRepository,
      queryOptions,
      "chimeMeetingId",
    );

    if (!meetingConfig.chimeMeetingId || !meetingConfig.meetingLaunchTime) {
      throw new BadRequestException(EChimeMeetingConfigurationErrorCodes.SIP_MEDIA_MEETING_NOT_STARTED);
    }

    if (meetingConfig.clientPstnCallCount >= this.MAX_PSTN_CALLS_FOR_CLIENT) {
      this.lokiLogger.error(`Meeting ${meetingConfig.id} PSTN calls limit exceeded`);
      throw new BadRequestException(EChimeMeetingConfigurationErrorCodes.SIP_MEDIA_MAX_PSTN_CALLS_REACHED);
    }

    const attendee = await this.attendeeManagementService.addPstnParticipantToLiveMeeting(
      meetingConfig,
      dto.toPhoneNumber,
    );
    const fromPhoneNumber = this.TEMPORARY_PHONE_NUMBER;
    await this.chimeSdkService.createSipMediaApplicationCall(
      fromPhoneNumber,
      dto.toPhoneNumber,
      meetingConfig.chimeMeetingId,
      attendee.attendeeId,
    );

    await this.chimeMeetingConfigurationRepository.update(meetingConfig.id, {
      clientPstnCallCount: meetingConfig.clientPstnCallCount + 1,
    });

    return { message: "Successfully created calls" };
  }

  private async createMultipleSipCalls(
    chimeMeetingId: string,
    attendees: TMeetingConfigForParticipants["attendees"],
  ): Promise<void> {
    const fromPhoneNumber = this.TEMPORARY_PHONE_NUMBER;

    for (const attendee of attendees) {
      if (!attendee.guestPhoneNumber) {
        this.lokiLogger.error(`Skipping attendee without phone number: ${JSON.stringify(attendee)}`);
        continue;
      }

      await this.chimeSdkService.createSipMediaApplicationCall(
        fromPhoneNumber,
        attendee.guestPhoneNumber,
        chimeMeetingId,
        attendee.attendeeId,
      );
    }
  }
}

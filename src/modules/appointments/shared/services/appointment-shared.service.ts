import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import {
  CreateVirtualAppointmentDto,
  CreateFaceToFaceAppointmentDto,
  UpdateAppointmentDto,
  CancelAppointmentDto,
  CheckInOutAppointmentDto,
} from "src/modules/appointments/appointment/common/dto";
import { UserRole } from "src/modules/users/entities";
import { Appointment, AppointmentAdminInfo, AppointmentReminder } from "src/modules/appointments/appointment/entities";
import { BookingSlotManagementService } from "src/modules/booking-slot-management/services";
import { differenceInHours, differenceInMilliseconds, isBefore, isWithinInterval, subHours } from "date-fns";
import { EAppointmentStatus, EAppointmentCommunicationType } from "src/modules/appointments/appointment/common/enums";
import {
  ADMIN_ROLES,
  CLIENT_ROLES,
  UNDEFINED_VALUE,
  ONE_HUNDRED,
  INTERPRETER_ROLES,
  LFH_ADMIN_ROLES,
} from "src/common/constants";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import {
  TCancelAppointment,
  TCheckInOutAppointment,
  TUpdateAppointment,
} from "src/modules/appointments/appointment/common/types";
import { AUDIO_VIDEO_COMMUNICATION_TYPES } from "src/modules/appointments/shared/common/constants";
import { UrlShortenerService } from "src/modules/url-shortener/services";
import { IAppointmentInvitationList } from "src/modules/appointments/appointment/common/interfaces";
import { IAppointmentParticipantInvitationOutput } from "src/modules/appointments/appointment/common/outputs";
import { AppointmentNotificationService } from "src/modules/appointments/shared/services";
import {
  TAppointmentForInvitation,
  TAttendeeForInvitation,
  TClientForInvitation,
  TDeleteChimeMeetingWithAttendees,
  TDisableRedFlag,
  TIsAppointmentCancellationRestrictedByTimeLimits,
  TParticipantForInvitation,
} from "src/modules/appointments/shared/common/types";
import { isInRoles } from "src/common/utils";
import { LokiLogger } from "src/common/logger";
import { ChimeMeetingConfiguration } from "src/modules/chime-meeting-configuration/entities";
import { ShortUrl } from "src/modules/url-shortener/entities";
import { RedisService } from "src/modules/redis/services";
import {
  CHECK_IN_APPOINTMENT_TYPES,
  CHECK_OUT_APPOINTMENT_TYPES,
} from "src/modules/appointments/appointment/common/constants";
import { EAppointmentSharedErrorCodes } from "src/modules/appointments/shared/common/enums";

@Injectable()
export class AppointmentSharedService {
  private readonly lokiLogger = new LokiLogger(AppointmentSharedService.name);

  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(AppointmentAdminInfo)
    private readonly appointmentAdminInfoRepository: Repository<AppointmentAdminInfo>,
    @InjectRepository(AppointmentReminder)
    private readonly appointmentReminderRepository: Repository<AppointmentReminder>,
    @InjectRepository(ChimeMeetingConfiguration)
    private readonly chimeMeetingConfigurationRepository: Repository<ChimeMeetingConfiguration>,
    @InjectRepository(ShortUrl)
    private readonly shortUrlRepository: Repository<ShortUrl>,
    private readonly bookingSlotManagementService: BookingSlotManagementService,
    private readonly urlShortenerService: UrlShortenerService,
    private readonly appointmentNotificationService: AppointmentNotificationService,
    private readonly redisService: RedisService,
  ) {}

  public async checkConflictingAppointmentsBeforeCreate(
    client: UserRole,
    dto: CreateVirtualAppointmentDto | CreateFaceToFaceAppointmentDto,
  ): Promise<void> {
    const conflictingAppointments = await this.getConflictingAppointmentsBeforeCreate(client.id, dto);

    if (conflictingAppointments.length === 0) {
      return;
    }

    throw new BadRequestException({
      message: EAppointmentSharedErrorCodes.TIME_ALREADY_RESERVED,
      conflictingAppointments: conflictingAppointments,
    });
  }

  private async getConflictingAppointmentsBeforeCreate(
    clientId: string,
    dto: CreateVirtualAppointmentDto | CreateFaceToFaceAppointmentDto,
  ): Promise<Appointment[]> {
    if (dto.schedulingExtraDay && dto.schedulingExtraDays && dto.schedulingExtraDays.length > 0) {
      return await this.bookingSlotManagementService.findConflictingAppointmentsGroupBeforeCreation(
        clientId,
        dto.scheduledStartTime,
        dto.schedulingDurationMin,
        dto.schedulingExtraDays,
      );
    }

    return await this.bookingSlotManagementService.findConflictingAppointmentsBeforeCreation(
      clientId,
      dto.scheduledStartTime,
      dto.schedulingDurationMin,
    );
  }

  public async isAppointmentChangesRestrictedByTimeLimits(
    appointment: TUpdateAppointment,
    dto: UpdateAppointmentDto,
    isAddressUpdate: boolean = false,
  ): Promise<void> {
    if (appointment.status === EAppointmentStatus.PENDING) {
      return;
    }

    const FACE_TO_FACE_TIME_LIMIT_HOURS: number = 24;
    const VIRTUAL_TIME_LIMIT_HOURS: number = 12;

    const currentTime = new Date();
    const hoursUntilAppointment = differenceInHours(appointment.scheduledStartTime, currentTime);

    const isFaceToFace = appointment.communicationType === EAppointmentCommunicationType.FACE_TO_FACE;
    const timeLimit = isFaceToFace ? FACE_TO_FACE_TIME_LIMIT_HOURS : VIRTUAL_TIME_LIMIT_HOURS;

    const isRestricted =
      (dto.scheduledStartTime && hoursUntilAppointment < timeLimit) ||
      (dto.schedulingDurationMin && hoursUntilAppointment < timeLimit) ||
      (dto.topic && hoursUntilAppointment < timeLimit) ||
      (dto.preferredInterpreterGender && hoursUntilAppointment < timeLimit) ||
      (dto.languageFrom && hoursUntilAppointment < timeLimit) ||
      (dto.languageTo && hoursUntilAppointment < timeLimit) ||
      (isFaceToFace && isAddressUpdate && hoursUntilAppointment < timeLimit);

    if (isRestricted) {
      throw new BadRequestException({
        message: EAppointmentSharedErrorCodes.UPDATES_NOT_ALLOWED_WITHIN_TIME_LIMIT,
        variables: { timeLimit },
      });
    }
  }

  public isAppointmentCancellationRestrictedByTimeLimits(
    appointment: TIsAppointmentCancellationRestrictedByTimeLimits,
  ): boolean {
    if (appointment.status === EAppointmentStatus.PENDING) {
      return false;
    }

    const { scheduledStartTime, creationDate, communicationType } = appointment;
    const CANCELLATION_REFUND_WINDOW_HOURS: number = 24;
    const REFUND_THRESHOLD_PERCENTAGE: number = 30;
    const FACE_TO_FACE_TIME_LIMIT_HOURS: number = 24;
    const VIRTUAL_TIME_LIMIT_HOURS: number = 12;

    const isFaceToFace = communicationType === EAppointmentCommunicationType.FACE_TO_FACE;
    const timeLimit = isFaceToFace ? FACE_TO_FACE_TIME_LIMIT_HOURS : VIRTUAL_TIME_LIMIT_HOURS;

    const { createdWithinTimeWindow, remainingPercent, hoursUntilAppointment } = this.checkAppointmentTimeConstraints(
      creationDate,
      scheduledStartTime,
      CANCELLATION_REFUND_WINDOW_HOURS,
    );

    if (createdWithinTimeWindow) {
      return remainingPercent <= REFUND_THRESHOLD_PERCENTAGE;
    }

    return hoursUntilAppointment <= timeLimit;
  }

  public async checkConflictAppointmentsBeforeUpdate(
    clientId: string,
    appointmentId: string,
    scheduledStartTime: Date,
    schedulingDurationMin: number,
  ): Promise<void> {
    const conflictingAppointments = await this.bookingSlotManagementService.findConflictingAppointmentsBeforeUpdate(
      clientId,
      appointmentId,
      scheduledStartTime,
      schedulingDurationMin,
    );

    if (conflictingAppointments.length > 0) {
      throw new BadRequestException({
        message: EAppointmentSharedErrorCodes.TIME_ALREADY_RESERVED,
        conflictingAppointments: conflictingAppointments,
      });
    }
  }

  public orderNeedsRecreation(appointment: TUpdateAppointment, dto: UpdateAppointmentDto): boolean {
    switch (true) {
      case dto.scheduledStartTime &&
        new Date(dto.scheduledStartTime).getTime() !== appointment.scheduledStartTime.getTime():
        return true;

      case dto.schedulingDurationMin && dto.schedulingDurationMin !== appointment.schedulingDurationMin:
        return true;

      case dto.topic && dto.topic !== appointment.topic:
        return true;

      case dto.preferredInterpreterGender && dto.preferredInterpreterGender !== appointment.preferredInterpreterGender:
        return true;

      case dto.languageFrom && dto.languageFrom !== appointment.languageFrom:
        return true;

      case dto.languageTo && dto.languageTo !== appointment.languageTo:
        return true;

      case dto.acceptOvertimeRates !== UNDEFINED_VALUE && dto.acceptOvertimeRates !== appointment.acceptOvertimeRates:
        return true;

      default:
        return false;
    }
  }

  public validateCancellationRequest(
    appointment: TCancelAppointment,
    user: ITokenUserData,
    dto: CancelAppointmentDto,
  ): void {
    const { status, communicationType } = appointment;

    if (dto.isAdminCancelByClient && !isInRoles(ADMIN_ROLES, user.role)) {
      throw new BadRequestException(EAppointmentSharedErrorCodes.INCORRECT_FIELD);
    }

    const isLiveFaceToFaceByAdminOrClient =
      status === EAppointmentStatus.LIVE &&
      communicationType === EAppointmentCommunicationType.FACE_TO_FACE &&
      isInRoles([...ADMIN_ROLES, ...CLIENT_ROLES], user.role);
    const isCancellableStatus =
      status === EAppointmentStatus.ACCEPTED ||
      status === EAppointmentStatus.PENDING ||
      isLiveFaceToFaceByAdminOrClient;

    if (!isCancellableStatus) {
      throw new BadRequestException(EAppointmentSharedErrorCodes.CANNOT_BE_CANCELLED);
    }
  }

  public checkAppointmentTimeConstraints(
    creationDate: Date,
    scheduledStartTime: Date,
    timeWindowHours: number = 24,
  ): {
    createdWithinTimeWindow: boolean;
    remainingPercent: number;
    hoursUntilAppointment: number;
  } {
    const currentTime = new Date();

    const hoursUntilAppointment = differenceInHours(scheduledStartTime, currentTime);

    const createdWithinTimeWindow = isWithinInterval(creationDate, {
      start: subHours(currentTime, timeWindowHours),
      end: scheduledStartTime,
    });

    let remainingPercent = 0;

    if (createdWithinTimeWindow) {
      const totalTimeMs = differenceInMilliseconds(scheduledStartTime, creationDate);
      const remainingTimeMs = differenceInMilliseconds(scheduledStartTime, currentTime);
      remainingPercent = (remainingTimeMs / totalTimeMs) * ONE_HUNDRED;
    }

    return {
      createdWithinTimeWindow,
      remainingPercent,
      hoursUntilAppointment,
    };
  }

  public validateAppointmentCheckInOut(
    appointment: TCheckInOutAppointment,
    dto: CheckInOutAppointmentDto,
    user: ITokenUserData,
  ): void {
    const { communicationType, alternativePlatform, status } = appointment;

    const isFaceToFace = communicationType === EAppointmentCommunicationType.FACE_TO_FACE;
    const isAlternativePlatform =
      alternativePlatform === true && AUDIO_VIDEO_COMMUNICATION_TYPES.includes(communicationType);

    if (!isFaceToFace && !isAlternativePlatform) {
      throw new BadRequestException(EAppointmentSharedErrorCodes.INVALID_COMMUNICATION_TYPE);
    }

    if (status !== EAppointmentStatus.LIVE) {
      throw new BadRequestException(EAppointmentSharedErrorCodes.MUST_BE_LIVE_STATUS);
    }

    this.validateAlternativeTime(dto, appointment);

    if (CHECK_IN_APPOINTMENT_TYPES.includes(dto.type)) {
      this.validateCheckInPermissions(appointment, user);
    }

    if (CHECK_OUT_APPOINTMENT_TYPES.includes(dto.type)) {
      this.validateCheckOutPermissions(appointment, user);
    }
  }

  private validateAlternativeTime(dto: CheckInOutAppointmentDto, appointment: TCheckInOutAppointment): void {
    const { appointmentExternalSession, scheduledStartTime } = appointment;

    if (!dto.alternativeTime || !appointmentExternalSession) {
      return;
    }

    const appointmentStartReference = appointmentExternalSession.alternativeStartTime ?? scheduledStartTime;

    if (isBefore(dto.alternativeTime, appointmentStartReference)) {
      throw new BadRequestException(EAppointmentSharedErrorCodes.ALTERNATIVE_END_TIME_ERROR);
    }
  }

  private validateCheckInPermissions(appointment: TCheckInOutAppointment, user: ITokenUserData): void {
    if (isInRoles(LFH_ADMIN_ROLES, user.role)) {
      throw new ForbiddenException(EAppointmentSharedErrorCodes.ADMINS_CANNOT_CHECK_IN);
    }

    const { communicationType, alternativePlatform } = appointment;
    const isFaceToFace = communicationType === EAppointmentCommunicationType.FACE_TO_FACE;
    const isAlternativePlatform =
      alternativePlatform === true && AUDIO_VIDEO_COMMUNICATION_TYPES.includes(communicationType);

    if (isFaceToFace && isInRoles(CLIENT_ROLES, user.role)) {
      throw new BadRequestException(EAppointmentSharedErrorCodes.CLIENTS_CANNOT_CHECK_IN_FACE_TO_FACE);
    }

    if (isAlternativePlatform && isInRoles(CLIENT_ROLES, user.role)) {
      throw new BadRequestException(EAppointmentSharedErrorCodes.CLIENTS_CANNOT_CHECK_IN_ALTERNATIVE);
    }
  }

  private validateCheckOutPermissions(appointment: TCheckInOutAppointment, user: ITokenUserData): void {
    const { communicationType, alternativePlatform } = appointment;
    const isFaceToFace = communicationType === EAppointmentCommunicationType.FACE_TO_FACE;
    const isAlternativePlatform =
      alternativePlatform === true && AUDIO_VIDEO_COMMUNICATION_TYPES.includes(communicationType);

    if (isFaceToFace && isInRoles(CLIENT_ROLES, user.role)) {
      throw new BadRequestException(EAppointmentSharedErrorCodes.CLIENTS_CANNOT_CHECK_OUT_FACE_TO_FACE);
    }

    if (isAlternativePlatform && isInRoles(INTERPRETER_ROLES, user.role)) {
      throw new BadRequestException(EAppointmentSharedErrorCodes.INTERPRETERS_CANNOT_CHECK_OUT_ALTERNATIVE);
    }
  }

  public async sendParticipantsInvitations(
    appointment: TAppointmentForInvitation,
    client: TClientForInvitation,
    participants: TParticipantForInvitation[],
    attendees?: TAttendeeForInvitation[],
  ): Promise<void> {
    const invitationBaseData: Omit<IAppointmentParticipantInvitationOutput, "meetingUrl"> = {
      clientFirstName: client.profile.preferredName ?? client.profile.firstName,
      clientLastName: client.profile.lastName,
      platformId: appointment.platformId,
      scheduledStartTime: appointment.scheduledStartTime,
      languageFrom: appointment.languageFrom,
      languageTo: appointment.languageTo,
      topic: appointment.topic,
      schedulingDurationMin: appointment.schedulingDurationMin,
    };
    const invitationList = this.buildAppointmentInvitationList(appointment, participants, attendees);

    for (const { email, phoneNumber, meetingUrl } of invitationList) {
      if (!email && !phoneNumber) {
        continue;
      }

      let invitationUrl: string | null = meetingUrl;

      if (!email && phoneNumber) {
        invitationUrl = await this.urlShortenerService.createAppointmentShortUrl(meetingUrl, appointment);
      }

      if (!invitationUrl) {
        continue;
      }

      const invitationData: IAppointmentParticipantInvitationOutput = {
        ...invitationBaseData,
        meetingUrl: invitationUrl,
      };
      await this.appointmentNotificationService.sendParticipantInvitation(invitationData, email, phoneNumber);
    }
  }

  private buildAppointmentInvitationList(
    appointment: TAppointmentForInvitation,
    participants: TParticipantForInvitation[],
    attendees?: TAttendeeForInvitation[],
  ): IAppointmentInvitationList[] {
    const invitationList: IAppointmentInvitationList[] = [];

    if (attendees && attendees.length > 0) {
      const participantsMap = new Map<string, TParticipantForInvitation>();

      for (const participant of participants) {
        participantsMap.set(participant.id, participant);
      }

      for (const attendee of attendees) {
        const participant = participantsMap.get(attendee.externalUserId);
        invitationList.push({
          meetingUrl: attendee.joinUrl,
          email: participant?.email || null,
          phoneNumber:
            participant?.phoneCode && participant?.phoneNumber
              ? `${participant.phoneCode}${participant.phoneNumber}`
              : attendee.guestPhoneNumber,
        });
      }
    } else {
      if (!appointment.alternativeVideoConferencingPlatformLink) {
        return invitationList;
      }

      for (const participant of participants) {
        invitationList.push({
          meetingUrl: appointment.alternativeVideoConferencingPlatformLink,
          email: participant.email,
          phoneNumber:
            participant.phoneCode && participant.phoneNumber
              ? `${participant.phoneCode}${participant.phoneNumber}`
              : null,
        });
      }
    }

    return invitationList;
  }

  public async disableRedFlag(appointments: TDisableRedFlag | TDisableRedFlag[]): Promise<void> {
    const appointmentsArray = Array.isArray(appointments) ? appointments : [appointments];
    const adminInfoIds = this.fetchAdminInfoIds(appointmentsArray);

    if (adminInfoIds.length > 0) {
      await this.appointmentAdminInfoRepository.update({ id: In(adminInfoIds) }, { isRedFlagEnabled: false });
    }
  }

  private fetchAdminInfoIds(appointments: TDisableRedFlag[]): string[] {
    const adminInfoIds: string[] = [];
    for (const appointment of appointments) {
      if (appointment.appointmentAdminInfo && appointment.appointmentAdminInfo.id) {
        adminInfoIds.push(appointment.appointmentAdminInfo.id);
      } else {
        this.lokiLogger.error(`No Appointment Admin Info found for appointment Id: ${appointment.id}`);
      }
    }

    return adminInfoIds;
  }

  public async changeAppointmentStatus(appointmentId: string, status: EAppointmentStatus): Promise<void> {
    await this.appointmentRepository.update({ id: appointmentId }, { status });
  }

  public async deleteAppointmentReminder(appointmentId: string): Promise<void> {
    await this.appointmentReminderRepository.delete({ appointment: { id: appointmentId } });
  }

  public async deleteChimeMeetingWithAttendees(meetingConfig: TDeleteChimeMeetingWithAttendees): Promise<void> {
    await this.chimeMeetingConfigurationRepository.remove(meetingConfig as ChimeMeetingConfiguration);
  }

  public async deleteAppointmentShortUrls(appointmentId: string): Promise<void> {
    await this.shortUrlRepository.delete({ appointment: { id: appointmentId } });
  }

  public async removeLiveAppointmentCacheData(id: string): Promise<void> {
    const cacheKey = `live-appointment-data:${id}`;
    await this.redisService.del(cacheKey);
  }
}

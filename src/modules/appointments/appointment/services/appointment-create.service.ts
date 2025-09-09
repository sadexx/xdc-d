import {
  CreateFaceToFaceAppointmentDto,
  CreateVirtualAppointmentDto,
} from "src/modules/appointments/appointment/common/dto";
import { InjectRepository } from "@nestjs/typeorm";
import { UserRole } from "src/modules/users/entities";
import { Repository } from "typeorm";
import { BadRequestException, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { Appointment, AppointmentAdminInfo, AppointmentReminder } from "src/modules/appointments/appointment/entities";
import {
  ICreateAppointment,
  ICreateAppointmentAdminInfo,
} from "src/modules/appointments/appointment/common/interfaces";
import { MultiWayParticipant } from "src/modules/multi-way-participant/entities";
import {
  EAppointmentInterpretingType,
  EAppointmentParticipantType,
  EAppointmentSchedulingType,
} from "src/modules/appointments/appointment/common/enums";
import { MultiWayParticipantService } from "src/modules/multi-way-participant/services";
import { AttendeeCreationService, MeetingCreationService } from "src/modules/chime-meeting-configuration/services";
import { AppointmentOrderCreateService } from "src/modules/appointment-orders/workflow/services";
import { AppointmentOrder } from "src/modules/appointment-orders/appointment-order/entities";
import { UNDEFINED_VALUE } from "src/common/constants";
import { ICreateAppointmentOutput } from "src/modules/appointments/appointment/common/outputs";
import { CreateFaceToFaceAppointmentAddressDto } from "src/modules/addresses/common/dto";
import { findOneOrFail } from "src/common/utils";
import { AppointmentQueryOptionsService, AppointmentSharedService } from "src/modules/appointments/shared/services";
import { addMinutes } from "date-fns";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { OldGeneralPaymentsService, OldPaymentsHelperService } from "src/modules/payments/services";
import { Address } from "src/modules/addresses/entities";
import { OldEPayInStatus } from "src/modules/payments/common/enums";
import { LokiLogger } from "src/common/logger";
import { AppointmentFailedPaymentCancelService } from "src/modules/appointments/failed-payment-cancel/services";
import { AppointmentOrderSharedLogicService } from "src/modules/appointment-orders/shared/services";
import { ICreateFaceToFaceAppointmentAddress } from "src/modules/addresses/common/interfaces";
import { ICreateMultiWayParticipant } from "src/modules/multi-way-participant/common/interfaces";
import { Attendee } from "src/modules/chime-meeting-configuration/entities";

export class AppointmentCreateService {
  private readonly lokiLogger = new LokiLogger(AppointmentCreateService.name);
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(AppointmentAdminInfo)
    private readonly appointmentAdminInfoRepository: Repository<AppointmentAdminInfo>,
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
    private readonly appointmentQueryOptionsService: AppointmentQueryOptionsService,
    private readonly appointmentOrderSharedLogicService: AppointmentOrderSharedLogicService,
    private readonly appointmentFailedPaymentCancelService: AppointmentFailedPaymentCancelService,
    private readonly appointmentOrderCreateService: AppointmentOrderCreateService,
    private readonly multiWayParticipantService: MultiWayParticipantService,
    private readonly meetingCreationService: MeetingCreationService,
    private readonly attendeeCreationService: AttendeeCreationService,
    private readonly generalPaymentsService: OldGeneralPaymentsService,
    private readonly paymentsHelperService: OldPaymentsHelperService,
    private readonly appointmentSharedService: AppointmentSharedService,
  ) {}

  public async checkConflictsAndCreateVirtualAppointment(
    user: ITokenUserData,
    dto: CreateVirtualAppointmentDto,
  ): Promise<ICreateAppointmentOutput> {
    const queryOptions = this.appointmentQueryOptionsService.getClientForCreateAppointmentOptions(user.userRoleId);
    const client = await findOneOrFail(user.userRoleId, this.userRoleRepository, queryOptions);
    await this.appointmentSharedService.checkConflictingAppointmentsBeforeCreate(client, dto);

    return await this.createVirtualAppointment(client, dto);
  }

  public async createVirtualAppointment(
    client: UserRole,
    dto: CreateVirtualAppointmentDto,
  ): Promise<ICreateAppointmentOutput> {
    try {
      if (!dto.schedulingExtraDay) {
        const savedAppointment = await this.createVirtualAppointmentWithoutExtraDay(client, dto);

        if (savedAppointment.schedulingType === EAppointmentSchedulingType.ON_DEMAND) {
          return {
            message: "Virtual appointment created successfully.",
            id: savedAppointment.id,
            communicationType: savedAppointment.communicationType,
          };
        }
      }

      if (dto.schedulingExtraDay && dto.schedulingExtraDays && dto.schedulingExtraDays.length > 0) {
        await this.createVirtualAppointmentWithExtraDay(client, dto);
      }

      return { message: "Virtual appointment created successfully." };
    } catch (error) {
      this.lokiLogger.error(
        `Failed to create virtual appointment: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException("Unexpected error occurred while creating the virtual appointment.");
    }
  }

  private async createVirtualAppointmentWithoutExtraDay(
    client: UserRole,
    dto: CreateVirtualAppointmentDto,
  ): Promise<Appointment> {
    const savedAppointment = await this.constructAndConfigureAppointment(client, dto);

    let participants: MultiWayParticipant[] = [];
    let attendees: Attendee[] = [];

    if (
      dto.participantType === EAppointmentParticipantType.MULTI_WAY &&
      dto.participants &&
      dto.participants.length > 0
    ) {
      participants = await this.multiWayParticipantService.createMultiWayParticipants(
        dto.participants as ICreateMultiWayParticipant[],
        savedAppointment,
      );
    }

    if (!dto.alternativePlatform) {
      const meetingConfig = await this.meetingCreationService.constructAndCreateMeetingConfiguration(
        savedAppointment,
        participants.length,
      );

      attendees = await this.attendeeCreationService.constructAndCreateAttendees(
        client,
        participants,
        savedAppointment,
        meetingConfig,
      );
    }

    const appointmentOrder = (await this.appointmentOrderCreateService.constructAndCreateAppointmentOrder(
      savedAppointment,
      client,
    )) as AppointmentOrder;
    await this.createAppointmentAdminInfo(savedAppointment);

    await this.appointmentSharedService.sendParticipantsInvitations(savedAppointment, client, participants, attendees);

    this.paymentAuthAndSearchTriggerIndividual(savedAppointment, appointmentOrder.id).catch((error: Error) => {
      this.lokiLogger.error(
        `Failed to make payin: ${error.message}, appointmentId: ${savedAppointment.id}`,
        error.stack,
      );
    });

    return savedAppointment;
  }

  private async createVirtualAppointmentWithExtraDay(
    client: UserRole,
    dto: CreateVirtualAppointmentDto,
  ): Promise<void> {
    if (!dto.schedulingExtraDays || dto.schedulingExtraDays.length === 0) {
      throw new BadRequestException("schedulingExtraDays should not be empty");
    }

    const appointmentOrderGroup = await this.appointmentOrderCreateService.constructAndCreateAppointmentOrderGroup(
      dto,
      client,
    );

    const mainAppointment = await this.constructAndConfigureAppointment(
      client,
      dto,
      UNDEFINED_VALUE,
      UNDEFINED_VALUE,
      appointmentOrderGroup.platformId,
    );
    await this.appointmentRepository.save(mainAppointment);

    let participants: MultiWayParticipant[] = [];

    if (
      dto.participantType === EAppointmentParticipantType.MULTI_WAY &&
      dto.participants &&
      dto.participants.length > 0
    ) {
      participants = await this.multiWayParticipantService.createMultiWayParticipants(
        dto.participants as ICreateMultiWayParticipant[],
        mainAppointment,
      );
    }

    const appointments = [mainAppointment];
    for (const extraDayDto of dto.schedulingExtraDays) {
      const extraAppointment = await this.constructAndConfigureAppointment(
        client,
        dto,
        extraDayDto.scheduledStartTime,
        extraDayDto.schedulingDurationMin,
        appointmentOrderGroup.platformId,
      );

      if (dto.alternativePlatform && dto.alternativeVideoConferencingPlatformLink) {
        extraAppointment.alternativeVideoConferencingPlatformLink = dto.alternativeVideoConferencingPlatformLink;
      }

      appointments.push(extraAppointment);

      if (
        dto.participantType === EAppointmentParticipantType.MULTI_WAY &&
        dto.participants &&
        dto.participants.length > 0
      ) {
        await this.multiWayParticipantService.createMultiWayParticipants(
          dto.participants as ICreateMultiWayParticipant[],
          extraAppointment,
        );
      }
    }

    for (const appointment of appointments) {
      let attendees: Attendee[] = [];

      if (!dto.alternativePlatform) {
        const meetingConfig = await this.meetingCreationService.constructAndCreateMeetingConfiguration(
          appointment,
          participants.length,
        );

        attendees = await this.attendeeCreationService.constructAndCreateAttendees(
          client,
          participants,
          appointment,
          meetingConfig,
        );
      }

      await this.appointmentOrderCreateService.constructAndCreateAppointmentOrder(
        appointment,
        client,
        UNDEFINED_VALUE,
        appointmentOrderGroup,
      );
      await this.createAppointmentAdminInfo(appointment);

      await this.appointmentSharedService.sendParticipantsInvitations(appointment, client, participants, attendees);
    }

    await this.appointmentOrderCreateService.calculateTimeFramesForOrderGroup(
      appointmentOrderGroup.id,
      appointmentOrderGroup.platformId,
    );

    this.paymentAuthAndSearchTriggerGroup(appointments, appointmentOrderGroup.id).catch((error: Error) => {
      this.lokiLogger.error(
        `Failed to make payin auth: ${error.message}, appointmentGroupId: ${appointments[0].appointmentsGroupId}`,
        error.stack,
      );
    });
  }

  public async checkConflictsAndCreateFaceToFaceAppointment(
    user: ITokenUserData,
    dto: CreateFaceToFaceAppointmentDto,
  ): Promise<ICreateAppointmentOutput> {
    const queryOptions = this.appointmentQueryOptionsService.getClientForCreateAppointmentOptions(user.userRoleId);
    const client = await findOneOrFail(user.userRoleId, this.userRoleRepository, queryOptions);
    await this.appointmentSharedService.checkConflictingAppointmentsBeforeCreate(client, dto);

    return await this.createFaceToFaceAppointment(client, dto);
  }

  public async createFaceToFaceAppointment(
    client: UserRole,
    dto: CreateFaceToFaceAppointmentDto,
  ): Promise<ICreateAppointmentOutput> {
    try {
      if (!dto.schedulingExtraDay) {
        const savedAppointment = await this.createFaceToFaceAppointmentWithoutExtraDay(client, dto);

        if (savedAppointment.schedulingType === EAppointmentSchedulingType.ON_DEMAND) {
          return {
            message: "Face to face appointment created successfully.",
            id: savedAppointment.id,
            communicationType: savedAppointment.communicationType,
          };
        }
      }

      if (dto.schedulingExtraDay && dto.schedulingExtraDays && dto.schedulingExtraDays.length > 0) {
        await this.createFaceToFaceAppointmentWithExtraDay(client, dto);
      }

      return { message: "Face to face appointment created successfully." };
    } catch (error) {
      this.lokiLogger.error(
        `Failed to create face to face appointment: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException("Unexpected error occurred while creating the face to face appointment.");
    }
  }

  private async createFaceToFaceAppointmentWithoutExtraDay(
    client: UserRole,
    dto: CreateFaceToFaceAppointmentDto,
  ): Promise<Appointment> {
    const savedAppointment = await this.constructAndConfigureAppointment(client, dto);
    const address = await this.constructAndCreateFaceToFaceAppointmentAddress(dto.address, savedAppointment);

    if (
      dto.participantType === EAppointmentParticipantType.MULTI_WAY &&
      dto.participants &&
      dto.participants.length > 0
    ) {
      await this.multiWayParticipantService.createMultiWayParticipants(
        dto.participants as ICreateMultiWayParticipant[],
        savedAppointment,
      );
    }

    address.appointment = null;

    const appointmentOrder = (await this.appointmentOrderCreateService.constructAndCreateAppointmentOrder(
      savedAppointment,
      client,
      address,
    )) as AppointmentOrder;
    await this.createAppointmentAdminInfo(savedAppointment);

    this.paymentAuthAndSearchTriggerIndividual(savedAppointment, appointmentOrder.id).catch((error: Error) => {
      this.lokiLogger.error(
        `Failed to make payin: ${error.message}, appointmentId: ${savedAppointment.id}`,
        error.stack,
      );
    });

    return savedAppointment;
  }

  private async createFaceToFaceAppointmentWithExtraDay(
    client: UserRole,
    dto: CreateFaceToFaceAppointmentDto,
  ): Promise<void> {
    if (!dto.schedulingExtraDays || dto.schedulingExtraDays.length === 0) {
      throw new BadRequestException("schedulingExtraDays should not be empty");
    }

    const appointmentOrderGroup = await this.appointmentOrderCreateService.constructAndCreateAppointmentOrderGroup(
      dto,
      client,
    );

    const mainAppointment = await this.constructAndConfigureAppointment(
      client,
      dto,
      UNDEFINED_VALUE,
      UNDEFINED_VALUE,
      appointmentOrderGroup.platformId,
    );

    const mainAddress = await this.constructAndCreateFaceToFaceAppointmentAddress(dto.address, mainAppointment);
    mainAppointment.address = mainAddress;

    if (
      dto.participantType === EAppointmentParticipantType.MULTI_WAY &&
      dto.participants &&
      dto.participants.length > 0
    ) {
      await this.multiWayParticipantService.createMultiWayParticipants(
        dto.participants as ICreateMultiWayParticipant[],
        mainAppointment,
      );
    }

    const appointments = [mainAppointment];

    for (const extraDayDto of dto.schedulingExtraDays) {
      const extraAppointment = await this.constructAndConfigureAppointment(
        client,
        dto,
        extraDayDto.scheduledStartTime,
        extraDayDto.schedulingDurationMin,
        appointmentOrderGroup.platformId,
      );

      const addressDto = extraDayDto.sameAddress ? dto.address : extraDayDto.address;
      extraAppointment.address = await this.constructAndCreateFaceToFaceAppointmentAddress(
        addressDto as CreateFaceToFaceAppointmentAddressDto,
        extraAppointment,
      );

      if (
        dto.participantType === EAppointmentParticipantType.MULTI_WAY &&
        dto.participants &&
        dto.participants.length > 0
      ) {
        await this.multiWayParticipantService.createMultiWayParticipants(
          dto.participants as ICreateMultiWayParticipant[],
          extraAppointment,
        );
      }

      appointments.push(extraAppointment);
    }

    for (const appointment of appointments) {
      if (appointment.address) {
        appointment.address.appointment = null;
      }

      await this.appointmentOrderCreateService.constructAndCreateAppointmentOrder(
        appointment,
        client,
        appointment.address as Address,
        appointmentOrderGroup,
      );
      await this.createAppointmentAdminInfo(appointment);
    }

    await this.appointmentOrderCreateService.calculateTimeFramesForOrderGroup(
      appointmentOrderGroup.id,
      appointmentOrderGroup.platformId,
    );

    this.paymentAuthAndSearchTriggerGroup(appointments, appointmentOrderGroup.id).catch((error: Error) => {
      this.lokiLogger.error(
        `Failed to make payin auth: ${error.message}, appointmentGroupId: ${appointments[0].appointmentsGroupId}`,
        error.stack,
      );
    });
  }

  private async constructAndConfigureAppointment(
    client: UserRole,
    dto: CreateVirtualAppointmentDto | CreateFaceToFaceAppointmentDto,
    scheduledStartTime?: Date,
    schedulingDurationMin?: number,
    appointmentsGroupId?: string,
  ): Promise<Appointment> {
    const createAppointmentDto = await this.constructAppointmentDto(
      client,
      dto,
      scheduledStartTime,
      schedulingDurationMin,
      appointmentsGroupId,
    );
    const savedAppointment = await this.createAppointment(createAppointmentDto);

    return savedAppointment;
  }

  private async createAppointment(dto: ICreateAppointment): Promise<Appointment> {
    const newAppointment = this.appointmentRepository.create(dto);
    const savedAppointment = await this.appointmentRepository.save(newAppointment);

    return savedAppointment;
  }

  private async constructAppointmentDto(
    client: UserRole,
    dto: CreateVirtualAppointmentDto | CreateFaceToFaceAppointmentDto,
    scheduledStartTime?: Date,
    schedulingDurationMin?: number,
    appointmentsGroupId?: string,
  ): Promise<ICreateAppointment> {
    const determinedScheduledStartTime = scheduledStartTime ?? dto.scheduledStartTime;
    const determinedSchedulingDurationMin = schedulingDurationMin ?? dto.schedulingDurationMin;
    const determinedScheduledEndTime = addMinutes(determinedScheduledStartTime, determinedSchedulingDurationMin);

    if (!client.timezone) {
      throw new BadRequestException("Missing timezone. Please update your address.");
    }

    const appointmentDto: ICreateAppointment = {
      client: client,
      scheduledStartTime: determinedScheduledStartTime,
      scheduledEndTime: determinedScheduledEndTime,
      communicationType: dto.communicationType,
      schedulingType: dto.schedulingType,
      schedulingDurationMin: determinedSchedulingDurationMin,
      topic: dto.topic,
      preferredInterpreterGender: dto.preferredInterpreterGender ?? null,
      interpreterType: dto.interpreterType,
      interpretingType: dto.interpretingType,
      simultaneousInterpretingType: dto.simultaneousInterpretingType ?? null,
      languageFrom: dto.languageFrom,
      languageTo: dto.languageTo,
      participantType: dto.participantType,
      alternativePlatform: dto.alternativePlatform,
      alternativeVideoConferencingPlatformLink: dto.alternativeVideoConferencingPlatformLink ?? null,
      notes: dto.notes ?? null,
      schedulingExtraDay: dto.schedulingExtraDay,
      isGroupAppointment: appointmentsGroupId ? true : false,
      appointmentsGroupId: appointmentsGroupId ?? null,
      sameInterpreter: dto.sameInterpreter,
      operatedByCompanyName: client.operatedByCompanyName,
      operatedByCompanyId: client.operatedByCompanyId,
      operatedByMainCorporateCompanyName: client.operatedByMainCorporateCompanyName,
      operatedByMainCorporateCompanyId: client.operatedByMainCorporateCompanyId,
      acceptOvertimeRates: dto.acceptOvertimeRates,
      timezone: client.timezone,
      internalEstimatedEndTime: determinedScheduledEndTime,
      appointmentReminder: new AppointmentReminder(),
    };

    return appointmentDto;
  }

  public async createAppointmentAdminInfo(appointment: Appointment): Promise<void> {
    const { client } = appointment;

    if (!client || !client.user.phoneNumber) {
      throw new NotFoundException("Client not found.");
    }

    const appointmentAdminInfoDto: ICreateAppointmentAdminInfo = {
      appointment: appointment,
      completedMeetingDuration: 0,
      clientFirstName: client.profile.firstName,
      clientPreferredName: client.profile.preferredName,
      clientLastName: client.profile.lastName,
      clientPhone: client.user.phoneNumber,
      clientEmail: client.profile.contactEmail,
      clientDateOfBirth: client.profile.dateOfBirth,
      isRedFlagEnabled: appointment.interpretingType === EAppointmentInterpretingType.ESCORT ? true : false,
    };

    const newAppointmentAdminInfo = this.appointmentAdminInfoRepository.create(appointmentAdminInfoDto);
    await this.appointmentAdminInfoRepository.save(newAppointmentAdminInfo);
  }

  public async constructAndCreateFaceToFaceAppointmentAddress(
    dto: CreateFaceToFaceAppointmentAddressDto,
    appointment: Appointment,
  ): Promise<Address> {
    const newAddress = await this.constructFaceToFaceAppointmentAddressDto(dto, appointment);

    return await this.constructAndCreateAddress(newAddress);
  }

  private async constructFaceToFaceAppointmentAddressDto(
    dto: CreateFaceToFaceAppointmentAddressDto,
    appointment: Appointment,
  ): Promise<ICreateFaceToFaceAppointmentAddress> {
    return {
      appointment: appointment,
      latitude: dto.latitude,
      longitude: dto.longitude,
      country: dto.country,
      state: dto.state,
      suburb: dto.suburb,
      streetName: dto.streetName,
      streetNumber: dto.streetNumber,
      postcode: dto.postcode,
      building: dto.building,
      unit: dto.unit,
      timezone: appointment.timezone,
    };
  }

  public async constructAndCreateAddress(dto: ICreateFaceToFaceAppointmentAddress): Promise<Address> {
    const newAddress = this.addressRepository.create(dto);

    return await this.addressRepository.save(newAddress);
  }

  private async paymentAuthAndSearchTriggerIndividual(
    appointment: Appointment,
    appointmentOrderId: string,
  ): Promise<void> {
    let isPaymentAlreadyCancelled = false;

    const paymentSuccess = await this.generalPaymentsService.makePayInAuth(appointment).catch(async (error: Error) => {
      this.lokiLogger.error(`Failed to make payin: ${error.message}, appointmentId: ${appointment.id}`, error.stack);

      const waitListRedirectingResult = await this.paymentsHelperService.redirectPaymentToWaitList(appointment, true);

      if (waitListRedirectingResult.isNeedToCancelAppointment) {
        this.appointmentFailedPaymentCancelService
          .cancelAppointmentPaymentFailed(appointment.id)
          .then(() => {
            isPaymentAlreadyCancelled = true;
          })
          .catch((error: Error) => {
            this.lokiLogger.error(
              `Failed to cancel payin auth: ${error.message}, appointmentId: ${appointment.id}`,
              error.stack,
            );

            return OldEPayInStatus.AUTHORIZATION_FAILED;
          });
      }

      return OldEPayInStatus.AUTHORIZATION_FAILED;
    });

    if (
      paymentSuccess === OldEPayInStatus.AUTHORIZATION_SUCCESS ||
      paymentSuccess === OldEPayInStatus.REDIRECTED_TO_WAIT_LIST
    ) {
      return await this.appointmentOrderSharedLogicService.triggerLaunchSearchForIndividualOrder(appointmentOrderId);
    }

    if (!isPaymentAlreadyCancelled) {
      this.appointmentFailedPaymentCancelService
        .cancelAppointmentPaymentFailed(appointment.id)
        .catch((error: Error) => {
          this.lokiLogger.error(
            `Failed to cancel payin auth: ${error.message}, appointmentId: ${appointment.id}`,
            error.stack,
          );
        });
    }
  }

  private async paymentAuthAndSearchTriggerGroup(
    appointments: Appointment[],
    appointmentOrderGroupId: string,
  ): Promise<void> {
    let paymentStatus: OldEPayInStatus | null = null;
    let isAppointmentGroupMustBeenCancelled = false;

    for (const appointment of appointments) {
      const paymentSuccess = await this.generalPaymentsService
        .makePayInAuth(appointment)
        .catch(async (error: Error) => {
          this.lokiLogger.error(`Failed to make payin: ${error.message}`, error.stack);

          const waitListRedirectingResult = await this.paymentsHelperService.redirectPaymentToWaitList(
            appointment,
            true,
          );

          if (waitListRedirectingResult.isNeedToCancelAppointment) {
            isAppointmentGroupMustBeenCancelled = true;
          }

          return OldEPayInStatus.AUTHORIZATION_FAILED;
        });

      if (paymentSuccess === OldEPayInStatus.AUTHORIZATION_FAILED) {
        paymentStatus = paymentSuccess;
      }

      if (
        paymentSuccess === OldEPayInStatus.AUTHORIZATION_SUCCESS &&
        paymentStatus !== OldEPayInStatus.AUTHORIZATION_FAILED
      ) {
        paymentStatus = paymentSuccess;
      }

      if (
        (paymentSuccess === OldEPayInStatus.REDIRECTED_TO_WAIT_LIST ||
          paymentSuccess === OldEPayInStatus.PAY_IN_NOT_CHANGED ||
          paymentSuccess === OldEPayInStatus.PAY_IN_REATTACHED) &&
        paymentStatus !== OldEPayInStatus.AUTHORIZATION_FAILED &&
        paymentStatus !== OldEPayInStatus.AUTHORIZATION_SUCCESS
      ) {
        paymentStatus = paymentSuccess;
      }
    }

    if (
      paymentStatus === OldEPayInStatus.AUTHORIZATION_SUCCESS ||
      paymentStatus === OldEPayInStatus.REDIRECTED_TO_WAIT_LIST ||
      paymentStatus === OldEPayInStatus.PAY_IN_REATTACHED ||
      paymentStatus === OldEPayInStatus.PAY_IN_NOT_CHANGED
    ) {
      await this.appointmentOrderSharedLogicService.triggerLaunchSearchForIndividualOrderGroup(appointmentOrderGroupId);
    } else {
      if (isAppointmentGroupMustBeenCancelled && appointments[0].appointmentsGroupId) {
        this.generalPaymentsService.cancelPayInAuthForGroup(appointments).catch((error: Error) => {
          this.lokiLogger.error(
            `Failed to cancel payin auth: ${error.message}, appointmentGroupId: ${appointments[0].appointmentsGroupId}`,
            error.stack,
          );
        });

        this.appointmentFailedPaymentCancelService
          .cancelGroupAppointmentsPaymentFailed(appointments[0].appointmentsGroupId)
          .catch((error: Error) => {
            this.lokiLogger.error(
              `Failed to cancel payin auth: ${error.message}, appointmentGroupId: ${appointments[0].appointmentsGroupId}`,
              error.stack,
            );
          });
      }
    }
  }
}

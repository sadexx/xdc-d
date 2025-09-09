import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThan, Repository } from "typeorm";
import { UserRole } from "src/modules/users/entities";
import {
  DraftAddress,
  DraftAppointment,
  DraftExtraDay,
  DraftMultiWayParticipant,
} from "src/modules/draft-appointments/entities";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import {
  CreateDraftAddressDto,
  CreateDraftAppointmentsDto,
  CreateDraftExtraDayDto,
  CreateDraftMultiWayParticipantDto,
  GetAllDraftAppointmentsDto,
} from "src/modules/draft-appointments/common/dto";
import { findOneOrFail, findOneOrFailTyped, isInRoles } from "src/common/utils";
import { IMessageOutput } from "src/common/outputs";
import {
  ICreateDraftAddress,
  ICreateDraftAppointment,
  ICreateDraftExtraDay,
  ICreateDraftMultiWayParticipant,
} from "src/modules/draft-appointments/common/interfaces";
import { NotificationService } from "src/modules/notifications/services";
import { EmailsService } from "src/modules/emails/services";
import { ConfigService } from "@nestjs/config";
import { DraftAppointmentQueryOptionsService } from "src/modules/draft-appointments/services";
import {
  GetAllDraftAppointmentsOutput,
  IDraftAppointmentDetailsOutput,
} from "src/modules/draft-appointments/common/outputs";
import { CLIENT_ROLES } from "src/common/constants";
import { LokiLogger } from "src/common/logger";

@Injectable()
export class DraftAppointmentService {
  private readonly lokiLogger = new LokiLogger(DraftAppointmentService.name);
  private readonly FRONT_END_URL: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(DraftAppointment)
    private readonly draftAppointmentRepository: Repository<DraftAppointment>,
    @InjectRepository(DraftMultiWayParticipant)
    private readonly draftMultiWayParticipantRepository: Repository<DraftMultiWayParticipant>,
    @InjectRepository(DraftAddress)
    private readonly draftAddressRepository: Repository<DraftAddress>,
    @InjectRepository(DraftExtraDay)
    private readonly draftExtraDayRepository: Repository<DraftExtraDay>,
    private readonly draftAppointmentQueryOptionsService: DraftAppointmentQueryOptionsService,
    private readonly notificationService: NotificationService,
    private readonly emailsService: EmailsService,
  ) {
    this.FRONT_END_URL = this.configService.getOrThrow<string>("frontend.uri");
  }

  public async getAllDraftAppointmentsForAdmin(
    dto: GetAllDraftAppointmentsDto,
    user: ITokenUserData,
  ): Promise<GetAllDraftAppointmentsOutput> {
    const queryBuilder = this.draftAppointmentRepository.createQueryBuilder("draftAppointment");
    const adminUserRole = await findOneOrFailTyped<UserRole>(user.userRoleId, this.userRoleRepository, {
      where: { id: user.userRoleId },
      relations: { role: true },
    });
    this.draftAppointmentQueryOptionsService.getAllDraftAppointmentsForAdminOptions(queryBuilder, dto, adminUserRole);

    const [draftAppointments, count] = await queryBuilder.getManyAndCount();

    return {
      data: draftAppointments,
      total: count,
      limit: dto.limit,
      offset: dto.offset,
    };
  }

  public async getAllDraftAppointmentsForClient(user: ITokenUserData): Promise<DraftAppointment[]> {
    const queryOptions = this.draftAppointmentQueryOptionsService.getAllDraftAppointmentsForClientOptions(
      user.userRoleId,
    );
    const draftAppointments = await this.draftAppointmentRepository.find(queryOptions);

    return draftAppointments;
  }

  public async getDraftAppointmentById(id: string, user: ITokenUserData): Promise<DraftAppointment> {
    if (isInRoles(CLIENT_ROLES, user.role)) {
      return await this.getDraftAppointmentForClient(id, user);
    } else {
      return await this.getDraftAppointmentForAdmin(id);
    }
  }

  private async getDraftAppointmentForClient(id: string, user: ITokenUserData): Promise<DraftAppointment> {
    const queryOptions = this.draftAppointmentQueryOptionsService.getDraftAppointmentForClientOptions(
      id,
      user.userRoleId,
    );
    const draftAppointment = await findOneOrFail(id, this.draftAppointmentRepository, queryOptions);

    return draftAppointment;
  }

  private async getDraftAppointmentForAdmin(id: string): Promise<DraftAppointment> {
    const queryOptions = this.draftAppointmentQueryOptionsService.getDraftAppointmentForAdminOptions(id);
    const draftAppointment = await findOneOrFail(id, this.draftAppointmentRepository, queryOptions);

    return draftAppointment;
  }

  public async createFullDraftAppointment(dto: CreateDraftAppointmentsDto): Promise<IMessageOutput> {
    const queryOptions = this.draftAppointmentQueryOptionsService.getClientForCreateDraftAppointmentOptions(
      dto.userRoleId,
    );
    const client = await findOneOrFail(dto.userRoleId, this.userRoleRepository, queryOptions);

    const isGroupAppointment: boolean = dto.draftExtraDays ? true : false;

    const draftAppointment = await this.createDraftAppointment(client, dto, isGroupAppointment);

    if (dto.draftParticipants && dto.draftParticipants.length > 0) {
      await this.createDraftMultiWayParticipants(draftAppointment, dto.draftParticipants);
    }

    if (dto.draftAddress) {
      await this.createDraftAddressForAppointment(draftAppointment, dto.draftAddress);
    }

    if (dto.draftExtraDays && dto.draftExtraDays.length > 0) {
      await this.processDraftExtraDays(draftAppointment, dto.draftExtraDays);
    }

    await this.sendEmailAndPushConfirmationToClient(client, draftAppointment);

    return { message: "Successfully create draft appointment" };
  }

  private async createDraftAppointment(
    client: UserRole,
    dto: CreateDraftAppointmentsDto,
    isGroupAppointment: boolean,
  ): Promise<DraftAppointment> {
    const draftAppointmentData: ICreateDraftAppointment = {
      client: client,
      scheduledStartTime: dto.scheduledStartTime,
      communicationType: dto.communicationType,
      schedulingType: dto.schedulingType,
      schedulingDurationMin: dto.schedulingDurationMin,
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
      isGroupAppointment: isGroupAppointment,
      sameInterpreter: dto.sameInterpreter,
      operatedByCompanyName: client.operatedByCompanyName,
      operatedByCompanyId: client.operatedByCompanyId,
      operatedByMainCorporateCompanyName: client.operatedByMainCorporateCompanyName,
      operatedByMainCorporateCompanyId: client.operatedByMainCorporateCompanyId,
      acceptOvertimeRates: dto.acceptOvertimeRates,
    };

    const newDraftAppointment = this.draftAppointmentRepository.create(draftAppointmentData);

    return this.draftAppointmentRepository.save(newDraftAppointment);
  }

  private async createDraftMultiWayParticipants(
    draftAppointment: DraftAppointment,
    draftParticipants: CreateDraftMultiWayParticipantDto[],
  ): Promise<void> {
    const draftParticipantsToCreate: ICreateDraftMultiWayParticipant[] = draftParticipants.map((participantDto) => ({
      draftAppointment: draftAppointment,
      name: participantDto.name,
      age: participantDto.age ?? null,
      phoneCode: participantDto.phoneCode,
      phoneNumber: participantDto.phoneNumber,
      email: participantDto.email ?? null,
    }));

    const newDraftParticipants = this.draftMultiWayParticipantRepository.create(draftParticipantsToCreate);
    await this.draftMultiWayParticipantRepository.save(newDraftParticipants);
  }

  private async createDraftAddressForAppointment(
    draftAppointment: DraftAppointment,
    dto: CreateDraftAddressDto,
  ): Promise<void> {
    const addressData: ICreateDraftAddress = {
      draftAppointment: draftAppointment,
      latitude: dto.latitude,
      longitude: dto.longitude,
      country: dto.country,
      state: dto.state,
      suburb: dto.suburb,
      streetName: dto.streetName,
      streetNumber: dto.streetNumber,
      postcode: dto.postcode,
      building: dto.building ?? null,
      unit: dto.unit ?? null,
    };

    const newAddress = this.draftAddressRepository.create(addressData);
    await this.draftAddressRepository.save(newAddress);
  }

  private async processDraftExtraDays(
    draftAppointment: DraftAppointment,
    draftExtraDaysDto: CreateDraftExtraDayDto[],
  ): Promise<void> {
    for (const extraDayDto of draftExtraDaysDto) {
      const newDraftExtraDay = await this.createDraftExtraDay(draftAppointment, extraDayDto);

      if (extraDayDto.sameAddress === false && extraDayDto.draftAddress) {
        await this.createDraftAddressForExtraDay(newDraftExtraDay, extraDayDto.draftAddress);
      }
    }
  }

  private async createDraftExtraDay(
    draftAppointment: DraftAppointment,
    extraDayDto: CreateDraftExtraDayDto,
  ): Promise<DraftExtraDay> {
    const draftExtraDayData: ICreateDraftExtraDay = {
      draftAppointment: draftAppointment,
      scheduledStartTime: extraDayDto.scheduledStartTime,
      schedulingDurationMin: extraDayDto.schedulingDurationMin,
      sameAddress: extraDayDto.sameAddress ?? null,
      notes: extraDayDto.notes ?? null,
    };

    const newDraftExtraDay = this.draftExtraDayRepository.create(draftExtraDayData);

    return this.draftExtraDayRepository.save(newDraftExtraDay);
  }

  private async createDraftAddressForExtraDay(draftExtraDay: DraftExtraDay, dto: CreateDraftAddressDto): Promise<void> {
    const addressData: ICreateDraftAddress = {
      draftExtraDay: draftExtraDay,
      latitude: dto.latitude,
      longitude: dto.longitude,
      country: dto.country,
      state: dto.state,
      suburb: dto.suburb,
      streetName: dto.streetName,
      streetNumber: dto.streetNumber,
      postcode: dto.postcode,
      building: dto.building ?? null,
      unit: dto.unit ?? null,
    };

    const newAddress = this.draftAddressRepository.create(addressData);
    await this.draftAddressRepository.save(newAddress);
  }

  public async deleteOldDraftAppointments(): Promise<void> {
    const DAYS = 7;
    const oneWeeksAgo = new Date();
    oneWeeksAgo.setDate(oneWeeksAgo.getDate() - DAYS);

    const result = await this.draftAppointmentRepository.delete({
      creationDate: LessThan(oneWeeksAgo),
    });

    this.lokiLogger.log(`Deleted ${result.affected} draft appointments older than ${DAYS} days.`);
  }

  public async deleteDraftAppointment(id: string, user: ITokenUserData): Promise<IMessageOutput> {
    const queryOptions = this.draftAppointmentQueryOptionsService.getDeleteDraftAppointmentOptions(id, user);
    const result = await this.draftAppointmentRepository.delete(queryOptions);

    if (!result.affected || result.affected === 0) {
      throw new NotFoundException(`Draft Appointment with Id: ${id} not found.`);
    }

    return { message: "Successfully deleted draft appointment" };
  }

  private async sendEmailAndPushConfirmationToClient(
    client: UserRole,
    draftAppointment: DraftAppointment,
  ): Promise<void> {
    const draftAppointmentConfirmationLink = `${this.FRONT_END_URL}/draft-appointments/${draftAppointment.id}`;

    this.emailsService
      .sendDraftConfirmationLink(client.user.email, draftAppointmentConfirmationLink)
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send new draft appointment email for user email: ${client.user.email}`,
          error.stack,
        );
      });

    await this.sendDraftConfirmationNotification(client.id, draftAppointment.platformId, {
      draftAppointmentId: draftAppointment.id,
    });
  }

  private async sendDraftConfirmationNotification(
    clientId: string,
    platformId: string,
    draftAppointmentDetails: IDraftAppointmentDetailsOutput,
  ): Promise<void> {
    this.notificationService
      .sendDraftAppointmentConfirmationNotification(clientId, platformId, draftAppointmentDetails)
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Failed to send new draft appointment notification for userRoleId: ${clientId}`,
          error.stack,
        );
      });
  }
}

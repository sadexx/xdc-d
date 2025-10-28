import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { AppointmentOrder, AppointmentOrderGroup } from "src/modules/appointment-orders/appointment-order/entities";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { UserRole } from "src/modules/users/entities";
import { Address } from "src/modules/addresses/entities";
import {
  ICreateAppointmentOrder,
  ICreateAppointmentOrderGroup,
} from "src/modules/appointment-orders/appointment-order/common/interface";
import { CreateVirtualAppointmentDto } from "src/modules/appointments/appointment/common/dto";
import { SearchTimeFrameService } from "src/modules/appointment-orders/shared/services";
import { INTERPRETER_ROLES } from "src/common/constants";
import { EUserRoleName } from "src/modules/users/common/enums";
import { LokiLogger } from "src/common/logger";
import { AppointmentQueryService } from "src/modules/appointments/appointment/services";
import { EAppointmentOrderWorkflowErrorCodes } from "src/modules/appointment-orders/workflow/common/enums";

@Injectable()
export class AppointmentOrderCreateService {
  private readonly lokiLogger = new LokiLogger(AppointmentOrderCreateService.name);

  constructor(
    @InjectRepository(AppointmentOrder)
    private readonly appointmentOrderRepository: Repository<AppointmentOrder>,
    @InjectRepository(AppointmentOrderGroup)
    private readonly appointmentOrderGroupRepository: Repository<AppointmentOrderGroup>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly appointmentQueryService: AppointmentQueryService,
    private readonly searchTimeFrameService: SearchTimeFrameService,
  ) {}

  public async constructAndCreateAppointmentOrder(
    appointment: Appointment,
    client: UserRole,
    address?: Address,
    appointmentOrderGroup?: AppointmentOrderGroup,
  ): Promise<void | AppointmentOrder> {
    const createAppointmentOrder = await this.constructAppointmentOrderDto(
      appointment,
      client,
      address,
      appointmentOrderGroup,
    );
    const savedAppointmentOrder = await this.createAppointmentOrder(createAppointmentOrder);

    if (!appointmentOrderGroup && !savedAppointmentOrder.isOrderGroup) {
      return savedAppointmentOrder;
    }
  }

  private async constructAppointmentOrderDto(
    appointment: Appointment,
    client: UserRole,
    address?: Address,
    appointmentOrderGroup?: AppointmentOrderGroup,
  ): Promise<ICreateAppointmentOrder> {
    if (!client.user.platformId) {
      this.lokiLogger.error(`Appointment order create. User with id ${client.user.id} does not have platformId!`);
    }

    const appointmentOrder: ICreateAppointmentOrder = {
      appointment: appointment,
      platformId: appointment.platformId,
      scheduledStartTime: appointment.scheduledStartTime,
      scheduledEndTime: appointment.scheduledEndTime,
      communicationType: appointment.communicationType,
      schedulingType: appointment.schedulingType,
      schedulingDurationMin: appointment.schedulingDurationMin,
      topic: appointment.topic,
      preferredInterpreterGender: appointment.preferredInterpreterGender,
      interpreterType: appointment.interpreterType,
      interpretingType: appointment.interpretingType,
      languageFrom: appointment.languageFrom,
      languageTo: appointment.languageTo,
      clientPlatformId: client.user.platformId || "000000",
      clientFirstName: client.profile.firstName,
      clientPreferredName: client.profile.preferredName,
      clientLastName: client.profile.lastName,
      participantType: appointment.participantType,
      nextRepeatTime: null,
      repeatInterval: null,
      remainingRepeats: null,
      notifyAdmin: null,
      endSearchTime: null,
      operatedByCompanyName: client.operatedByCompanyName,
      operatedByCompanyId: client.operatedByCompanyId,
      operatedByMainCorporateCompanyName: client.operatedByMainCorporateCompanyName,
      operatedByMainCorporateCompanyId: client.operatedByMainCorporateCompanyId,
      timeToRestart: null,
      isFirstSearchCompleted: false,
      isSecondSearchCompleted: false,
      isSearchNeeded: false,
      isCompanyHasInterpreters: null,
      acceptOvertimeRates: appointment.acceptOvertimeRates,
      timezone: appointment.timezone,
      address: address ?? null,
    };

    if (appointmentOrderGroup) {
      return {
        ...appointmentOrder,
        appointmentOrderGroup,
        isOrderGroup: true,
        isFirstSearchCompleted: null,
        isSecondSearchCompleted: null,
        isSearchNeeded: null,
        acceptOvertimeRates: null,
        timezone: null,
      };
    } else {
      const { nextRepeatTime, repeatInterval, remainingRepeats, notifyAdmin, endSearchTime } =
        await this.searchTimeFrameService.calculateInitialTimeFrames(
          appointment.communicationType,
          appointment.scheduledStartTime,
        );
      const isCompanyHasInterpreters = await this.determineIfCompanyHasInterpreters(client);

      return {
        ...appointmentOrder,
        isOrderGroup: false,
        nextRepeatTime: nextRepeatTime,
        repeatInterval: repeatInterval,
        remainingRepeats: remainingRepeats,
        notifyAdmin: notifyAdmin,
        endSearchTime: endSearchTime,
        isCompanyHasInterpreters: isCompanyHasInterpreters,
      };
    }
  }

  public async createAppointmentOrder(dto: ICreateAppointmentOrder): Promise<AppointmentOrder> {
    const newAppointmentOrder = this.appointmentOrderRepository.create(dto);
    const savedAppointmentOrder = await this.appointmentOrderRepository.save(newAppointmentOrder);

    return savedAppointmentOrder;
  }

  public async constructAndCreateAppointmentOrderGroup(
    dto: CreateVirtualAppointmentDto,
    client: UserRole,
  ): Promise<AppointmentOrderGroup> {
    const createAppointmentOrderGroupDto = await this.constructAppointmentOrderGroup(
      dto,
      client as UserRole & { timezone: string },
    );

    return await this.createAppointmentOrderGroup(createAppointmentOrderGroupDto);
  }

  private async constructAppointmentOrderGroup(
    dto: CreateVirtualAppointmentDto,
    client: UserRole & { timezone: string },
  ): Promise<ICreateAppointmentOrderGroup> {
    const isCompanyHasInterpreters = await this.determineIfCompanyHasInterpreters(client);

    return {
      sameInterpreter: dto.sameInterpreter,
      operatedByCompanyName: client.operatedByCompanyName,
      operatedByCompanyId: client.operatedByCompanyId,
      operatedByMainCorporateCompanyName: client.operatedByMainCorporateCompanyName,
      operatedByMainCorporateCompanyId: client.operatedByMainCorporateCompanyId,
      isCompanyHasInterpreters: isCompanyHasInterpreters,
      acceptOvertimeRates: dto.acceptOvertimeRates,
      timezone: client.timezone,
    };
  }

  private async createAppointmentOrderGroup(dto: ICreateAppointmentOrderGroup): Promise<AppointmentOrderGroup> {
    const newAppointmentOrderGroup = this.appointmentOrderGroupRepository.create(dto);

    return await this.appointmentOrderGroupRepository.save(newAppointmentOrderGroup);
  }

  private async determineIfCompanyHasInterpreters(client: UserRole): Promise<boolean> {
    if (client.role.name === EUserRoleName.IND_CLIENT) {
      return true;
    }

    if (client.role.name === EUserRoleName.CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS_IND_USER) {
      if (!client.operatedByMainCorporateCompanyId || !client.operatedByMainCorporateCompanyName) {
        this.lokiLogger.warn(`Client with id ${client.id} does not have mainCompanyId or mainCompanyName.`);

        return false;
      }

      return await this.userRoleRepository.exists({
        where: {
          operatedByMainCorporateCompanyId: client.operatedByMainCorporateCompanyId,
          operatedByMainCorporateCompanyName: client.operatedByMainCorporateCompanyName,
          role: { name: In(INTERPRETER_ROLES) },
        },
        relations: {
          role: true,
        },
      });
    }

    return false;
  }

  public async calculateTimeFramesForOrderGroup(id: string, groupPlatformId: string): Promise<void> {
    const firstScheduledAppointment = await this.appointmentQueryService.getFirstScheduledAppointment(groupPlatformId);

    const { nextRepeatTime, repeatInterval, remainingRepeats, notifyAdmin, endSearchTime } =
      await this.searchTimeFrameService.calculateInitialTimeFrames(
        firstScheduledAppointment.communicationType,
        firstScheduledAppointment.scheduledStartTime,
      );

    if (!nextRepeatTime) {
      throw new BadRequestException(EAppointmentOrderWorkflowErrorCodes.UNABLE_TO_CALCULATE_NEXT_REPEAT_TIME);
    }

    await this.appointmentOrderGroupRepository.update(id, {
      nextRepeatTime: nextRepeatTime,
      repeatInterval: repeatInterval,
      remainingRepeats: remainingRepeats,
      notifyAdmin: notifyAdmin,
      endSearchTime: endSearchTime,
    });
  }
}

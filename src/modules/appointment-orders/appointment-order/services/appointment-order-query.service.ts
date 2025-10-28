import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { IResultListInterpreters } from "src/modules/appointment-orders/appointment-order/common/interface";
import { FindOneOptions, Repository } from "typeorm";
import { AppointmentOrder, AppointmentOrderGroup } from "src/modules/appointment-orders/appointment-order/entities";
import { InjectRepository } from "@nestjs/typeorm";
import {
  GetAllAppointmentOrdersDto,
  GetAllListInterpretersDto,
} from "src/modules/appointment-orders/appointment-order/common/dto";
import { AppointmentOrderQueryOptionsService } from "src/modules/appointment-orders/shared/services";
import {
  GetAllListInterpretersOutput,
  IAllTypeAppointmentOrdersOutput,
  IAppointmentOrderByIdOutput,
  IAppointmentOrderGroupByIdOutput,
} from "src/modules/appointment-orders/appointment-order/common/outputs";
import { findOneOrFail, findOneOrFailTyped, isInRoles } from "src/common/utils";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { INTERPRETER_ROLES } from "src/common/constants";
import { UserRole } from "src/modules/users/entities";
import { EAppointmentOrderErrorCodes } from "src/modules/appointment-orders/appointment-order/common/enum";

@Injectable()
export class AppointmentOrderQueryService {
  private lastChecked: Date = new Date();

  constructor(
    @InjectRepository(AppointmentOrder)
    private readonly appointmentOrderRepository: Repository<AppointmentOrder>,
    @InjectRepository(AppointmentOrderGroup)
    private readonly appointmentOrderGroupRepository: Repository<AppointmentOrderGroup>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly appointmentOrderQueryOptionsService: AppointmentOrderQueryOptionsService,
  ) {}

  public async getCompanyAppointmentOrders(
    user: ITokenUserData,
    dto: GetAllAppointmentOrdersDto,
  ): Promise<IAllTypeAppointmentOrdersOutput> {
    const adminUserRole = await findOneOrFailTyped<UserRole>(user.userRoleId, this.userRoleRepository, {
      where: { id: user.userRoleId },
      relations: { role: true },
    });

    const individualQueryBuilder = this.appointmentOrderRepository.createQueryBuilder("appointmentOrder");
    this.appointmentOrderQueryOptionsService.getAllAppointmentOrdersOptions(individualQueryBuilder, dto);

    const groupQueryBuilder = this.appointmentOrderGroupRepository.createQueryBuilder("appointmentOrderGroup");
    this.appointmentOrderQueryOptionsService.getAllAppointmentOrderGroupsOptions(groupQueryBuilder, dto);

    this.appointmentOrderQueryOptionsService.applyFiltersForCompanyAppointmentOrders(
      individualQueryBuilder,
      groupQueryBuilder,
      adminUserRole,
    );

    const individualAppointments = await individualQueryBuilder.getMany();
    const groupAppointments = await groupQueryBuilder.getMany();

    return {
      appointmentOrders: individualAppointments,
      appointmentOrdersGroups: groupAppointments,
    };
  }

  public async getInterpreterMatchedAppointmentOrdersByRole(
    user: ITokenUserData,
    dto: GetAllAppointmentOrdersDto,
  ): Promise<IAllTypeAppointmentOrdersOutput> {
    if (isInRoles(INTERPRETER_ROLES, user.role)) {
      return await this.getInterpreterMatchedAppointmentOrders(user.userRoleId, dto);
    } else {
      if (!dto.interpreterRoleId) {
        throw new BadRequestException(EAppointmentOrderErrorCodes.INTERPRETER_ROLE_ID_REQUIRED);
      }

      return await this.getInterpreterMatchedAppointmentOrders(dto.interpreterRoleId, dto);
    }
  }

  private async getInterpreterMatchedAppointmentOrders(
    userRoleId: string,
    dto: GetAllAppointmentOrdersDto,
  ): Promise<IAllTypeAppointmentOrdersOutput> {
    const individualQueryBuilder = this.appointmentOrderRepository.createQueryBuilder("appointmentOrder");
    this.appointmentOrderQueryOptionsService.getAllAppointmentOrdersOptions(individualQueryBuilder, dto);

    const groupQueryBuilder = this.appointmentOrderGroupRepository.createQueryBuilder("appointmentOrderGroup");
    this.appointmentOrderQueryOptionsService.getAllAppointmentOrderGroupsOptions(groupQueryBuilder, dto);

    this.appointmentOrderQueryOptionsService.applyFiltersForMatchedAppointmentOrders(
      individualQueryBuilder,
      groupQueryBuilder,
      userRoleId,
    );

    const individualAppointments = await individualQueryBuilder.getMany();
    const groupAppointments = await groupQueryBuilder.getMany();

    return {
      appointmentOrders: individualAppointments,
      appointmentOrdersGroups: groupAppointments,
    };
  }

  public async getInterpreterRejectedAppointmentOrdersByRole(
    user: ITokenUserData,
    dto: GetAllAppointmentOrdersDto,
  ): Promise<IAllTypeAppointmentOrdersOutput> {
    if (isInRoles(INTERPRETER_ROLES, user.role)) {
      return await this.getInterpreterRejectedAppointmentOrders(user.userRoleId, dto);
    } else {
      if (!dto.interpreterRoleId) {
        throw new BadRequestException(EAppointmentOrderErrorCodes.INTERPRETER_ROLE_ID_REQUIRED);
      }

      return await this.getInterpreterRejectedAppointmentOrders(dto.interpreterRoleId, dto);
    }
  }

  private async getInterpreterRejectedAppointmentOrders(
    userRoleId: string,
    dto: GetAllAppointmentOrdersDto,
  ): Promise<IAllTypeAppointmentOrdersOutput> {
    const individualQueryBuilder = this.appointmentOrderRepository.createQueryBuilder("appointmentOrder");
    this.appointmentOrderQueryOptionsService.getAllAppointmentOrdersOptions(individualQueryBuilder, dto);

    const groupQueryBuilder = this.appointmentOrderGroupRepository.createQueryBuilder("appointmentOrderGroup");
    this.appointmentOrderQueryOptionsService.getAllAppointmentOrderGroupsOptions(groupQueryBuilder, dto);

    this.appointmentOrderQueryOptionsService.applyFiltersForRejectedAppointmentOrders(
      individualQueryBuilder,
      groupQueryBuilder,
      userRoleId,
    );

    const individualAppointments = await individualQueryBuilder.getMany();
    const groupAppointments = await groupQueryBuilder.getMany();

    return {
      appointmentOrders: individualAppointments,
      appointmentOrdersGroups: groupAppointments,
    };
  }

  public async getAppointmentOrderById(id: string, user: ITokenUserData): Promise<IAppointmentOrderByIdOutput> {
    const queryOptions = this.appointmentOrderQueryOptionsService.getAppointmentOrderByIdOptions(id);
    const appointmentOrder = await findOneOrFail(id, this.appointmentOrderRepository, queryOptions);

    const isRejected = appointmentOrder.rejectedInterpreterIds.includes(user.userRoleId);

    return {
      ...appointmentOrder,
      isRejected,
    };
  }

  public async getOrdersInGroupById(id: string, user: ITokenUserData): Promise<IAppointmentOrderGroupByIdOutput> {
    const queryOptions = this.appointmentOrderQueryOptionsService.getOrdersInGroupByIdOptions(id);
    const appointmentOrderGroup = await findOneOrFail(id, this.appointmentOrderGroupRepository, queryOptions);

    const isRejected = appointmentOrderGroup.rejectedInterpreterIds.includes(user.userRoleId);

    return {
      ...appointmentOrderGroup,
      isRejected,
    };
  }

  public async getListOfInterpretersReceivedOrder(
    appointmentId: string,
    dto: GetAllListInterpretersDto,
  ): Promise<GetAllListInterpretersOutput> {
    const queryOptions = this.appointmentOrderQueryOptionsService.getListOfInterpretersReceivedOrderOptions(
      appointmentId,
      dto,
    );

    return this.fetchInterpretersFromQuery(
      this.appointmentOrderRepository,
      queryOptions,
      EAppointmentOrderErrorCodes.INTERPRETERS_LIST_NOT_FOUND_FOR_APPOINTMENT,
      dto,
    );
  }

  public async getListOfInterpretersReceivedOrderGroup(
    appointmentGroupId: string,
    dto: GetAllListInterpretersDto,
  ): Promise<GetAllListInterpretersOutput> {
    const queryOptions = this.appointmentOrderQueryOptionsService.getListOfInterpretersReceivedOrderGroupOptions(
      appointmentGroupId,
      dto,
    );

    return this.fetchInterpretersFromQuery(
      this.appointmentOrderGroupRepository,
      queryOptions,
      EAppointmentOrderErrorCodes.INTERPRETERS_LIST_NOT_FOUND_FOR_GROUP,
      dto,
    );
  }

  private async fetchInterpretersFromQuery(
    repository: Repository<AppointmentOrder | AppointmentOrderGroup>,
    queryOptions: { query: string; parameters: (string | number)[] },
    notFoundMessage: EAppointmentOrderErrorCodes,
    dto: GetAllListInterpretersDto,
  ): Promise<GetAllListInterpretersOutput> {
    const rawResult: IResultListInterpreters[] = await repository.query(queryOptions.query, queryOptions.parameters);

    if (!rawResult || rawResult.length === 0) {
      throw new NotFoundException(notFoundMessage);
    }

    const [{ result }] = rawResult;
    const { data, total } = result;

    return {
      data: data ?? [],
      total: total,
      limit: dto.limit,
      offset: dto.offset,
    };
  }

  public async getNewOrdersForWebSocket(): Promise<IAllTypeAppointmentOrdersOutput> {
    const findOptionsIndividualAppointment = this.appointmentOrderQueryOptionsService.getNewOrderForWebSocketOptions(
      this.lastChecked,
    );
    const findOptionsGroupAppointment = this.appointmentOrderQueryOptionsService.getNewOrdersForWebSocketOptions(
      this.lastChecked,
    );
    const newAppointmentOrders = await this.getAllIndividualAppointmentOrders(findOptionsIndividualAppointment);
    const newAppointmentOrdersGroups = await this.getAllAppointmentOrderGroups(findOptionsGroupAppointment);

    this.lastChecked = new Date();

    return {
      appointmentOrders: newAppointmentOrders,
      appointmentOrdersGroups: newAppointmentOrdersGroups,
    };
  }

  private async getAllIndividualAppointmentOrders(
    findOneOptions: FindOneOptions<AppointmentOrder>,
  ): Promise<AppointmentOrder[]> {
    return await this.appointmentOrderRepository.find(findOneOptions);
  }

  private async getAllAppointmentOrderGroups(
    findOneOptions: FindOneOptions<AppointmentOrderGroup>,
  ): Promise<AppointmentOrderGroup[]> {
    return await this.appointmentOrderGroupRepository.find(findOneOptions);
  }
}

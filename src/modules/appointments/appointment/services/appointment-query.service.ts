import { ForbiddenException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { FindManyOptions, Repository } from "typeorm";
import {
  ADMIN_ROLES,
  CLIENT_ROLES,
  UNDEFINED_VALUE,
  INTERPRETER_AND_CLIENT_ROLES,
  INTERPRETER_ROLES,
  NUMBER_OF_MINUTES_IN_FIVE_MINUTES,
} from "src/common/constants";
import { GetAllAppointmentsDto } from "src/modules/appointments/appointment/common/dto";
import { GetAllAppointmentsOutput } from "src/modules/appointments/appointment/common/outputs/get-all-appointments.output";
import { IWebSocketAppointmentsOutput } from "src/modules/appointments/appointment/common/outputs";
import { AppointmentQueryOptionsService } from "src/modules/appointments/shared/services";
import { findOneOrFail, findOneOrFailQueryBuilder, findOneOrFailTyped, isInRoles } from "src/common/utils";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import {
  GET_APPOINTMENTS_FOR_ADMIN_ROLES,
  GET_APPOINTMENTS_FOR_CLIENT_ROLES,
  GET_APPOINTMENTS_FOR_INTERPRETER_ROLES,
} from "src/modules/appointments/appointment/common/constants";
import { UserRole } from "src/modules/users/entities";
import { EAppointmentStatus } from "src/modules/appointments/appointment/common/enums";
import { subMinutes } from "date-fns";

@Injectable()
export class AppointmentQueryService {
  private lastChecked: Date = new Date();

  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly appointmentQueryOptions: AppointmentQueryOptionsService,
  ) {}

  public async getAllAppointments(user: ITokenUserData, dto: GetAllAppointmentsDto): Promise<GetAllAppointmentsOutput> {
    let appointments: Appointment[] = [];
    let count: number = 0;

    if (GET_APPOINTMENTS_FOR_CLIENT_ROLES.includes(user.role)) {
      [appointments, count] = await this.getAppointmentsForClientRoles(user, dto);
    }

    if (GET_APPOINTMENTS_FOR_INTERPRETER_ROLES.includes(user.role)) {
      [appointments, count] = await this.getAppointmentsForInterpreterRoles(user, dto);
    }

    if (GET_APPOINTMENTS_FOR_ADMIN_ROLES.includes(user.role)) {
      [appointments, count] = await this.getAppointmentsForAdminRoles(user, dto);
    }

    return {
      data: appointments,
      total: count,
      limit: dto.limit,
      offset: dto.offset,
    };
  }

  private async getAppointmentsForClientRoles(
    user: ITokenUserData,
    dto?: GetAllAppointmentsDto,
    archived: boolean = false,
    appointmentsGroupId?: string,
  ): Promise<[Appointment[], number]> {
    const queryBuilder = this.appointmentRepository.createQueryBuilder("appointment");
    const userRole = await findOneOrFailTyped<UserRole>(user.userRoleId, this.userRoleRepository, {
      where: { id: user.userRoleId },
      relations: { role: true },
    });

    this.appointmentQueryOptions.getAllAppointmentsForClientRolesOptions(
      queryBuilder,
      userRole,
      dto,
      archived,
      appointmentsGroupId,
    );

    const [appointments, count] = await queryBuilder.getManyAndCount();

    return [appointments, count];
  }

  private async getAppointmentsForInterpreterRoles(
    user: ITokenUserData,
    dto?: GetAllAppointmentsDto,
    archived: boolean = false,
    appointmentsGroupId?: string,
  ): Promise<[Appointment[], number]> {
    const queryBuilder = this.appointmentRepository.createQueryBuilder("appointment");
    const userRole = await findOneOrFailTyped<UserRole>(user.userRoleId, this.userRoleRepository, {
      where: { id: user.userRoleId },
      relations: { role: true },
    });

    this.appointmentQueryOptions.getAllAppointmentsForInterpreterRolesOptions(
      queryBuilder,
      userRole,
      appointmentsGroupId,
      archived,
      dto,
    );

    const [appointments, count] = await queryBuilder.getManyAndCount();

    return [appointments, count];
  }

  private async getAppointmentsForAdminRoles(
    user: ITokenUserData,
    dto?: GetAllAppointmentsDto,
    archived: boolean = false,
    appointmentsGroupId?: string,
  ): Promise<[Appointment[], number]> {
    const queryBuilder = this.appointmentRepository.createQueryBuilder("appointment");
    const userRole = await findOneOrFailTyped<UserRole>(user.userRoleId, this.userRoleRepository, {
      where: { id: user.userRoleId },
      relations: { role: true },
    });

    this.appointmentQueryOptions.getAllAppointmentsForAdminRolesOptions(
      queryBuilder,
      userRole,
      appointmentsGroupId,
      archived,
      dto,
    );

    const [appointments, count] = await queryBuilder.getManyAndCount();

    return [appointments, count];
  }

  public async getArchivedAppointments(
    user: ITokenUserData,
    dto: GetAllAppointmentsDto,
  ): Promise<GetAllAppointmentsOutput> {
    let appointments: Appointment[] = [];
    let count: number = 0;
    const archived = true;

    if (isInRoles(CLIENT_ROLES, user.role)) {
      [appointments, count] = await this.getAppointmentsForClientRoles(user, dto, archived);
    }

    if (isInRoles(INTERPRETER_ROLES, user.role)) {
      [appointments, count] = await this.getAppointmentsForInterpreterRoles(user, dto, archived);
    }

    if (isInRoles(ADMIN_ROLES, user.role)) {
      [appointments, count] = await this.getAppointmentsForAdminRoles(user, dto, archived);
    }

    return {
      data: appointments,
      total: count,
      limit: dto.limit,
      offset: dto.offset,
    };
  }

  public async getAppointmentById(id: string, user: ITokenUserData): Promise<Appointment> {
    if (isInRoles(INTERPRETER_AND_CLIENT_ROLES, user.role)) {
      return await this.getAppointmentForClientOrInterpreter(id, user);
    }

    if (isInRoles(ADMIN_ROLES, user.role)) {
      return await this.getAppointmentForAdmin(id);
    }

    throw new ForbiddenException("Invalid user role");
  }

  private async getAppointmentForClientOrInterpreter(id: string, user: ITokenUserData): Promise<Appointment> {
    const queryBuilder = this.appointmentRepository.createQueryBuilder("appointment");
    this.appointmentQueryOptions.getAppointmentForClientOrInterpreterOptions(queryBuilder, id, user);
    const appointment = await findOneOrFailQueryBuilder(id, queryBuilder, Appointment.name);

    return appointment;
  }

  private async getAppointmentForAdmin(id: string): Promise<Appointment> {
    const queryOptions = this.appointmentQueryOptions.getAppointmentForAdminOptions(id);
    const appointment = await findOneOrFail(id, this.appointmentRepository, queryOptions);

    return appointment;
  }

  public async getAppointmentsGroupIds(user: ITokenUserData): Promise<string[]> {
    const queryBuilder = this.appointmentRepository.createQueryBuilder("appointment");
    this.appointmentQueryOptions.getAppointmentsGroupIdsOptions(queryBuilder, user);

    const groupIds: { appointmentsGroupId: string }[] = await queryBuilder.getRawMany();

    return groupIds.map((item) => item.appointmentsGroupId);
  }

  public async getAppointmentsByGroupId(appointmentsGroupId: string, user: ITokenUserData): Promise<Appointment[]> {
    if (isInRoles(CLIENT_ROLES, user.role)) {
      const [appointments] = await this.getAppointmentsForClientRoles(
        user,
        UNDEFINED_VALUE,
        UNDEFINED_VALUE,
        appointmentsGroupId,
      );

      return appointments;
    }

    if (isInRoles(INTERPRETER_ROLES, user.role)) {
      const [appointments] = await this.getAppointmentsForInterpreterRoles(
        user,
        UNDEFINED_VALUE,
        UNDEFINED_VALUE,
        appointmentsGroupId,
      );

      return appointments;
    }

    if (isInRoles(ADMIN_ROLES, user.role)) {
      const [appointments] = await this.getAppointmentsForAdminRoles(
        user,
        UNDEFINED_VALUE,
        UNDEFINED_VALUE,
        appointmentsGroupId,
      );

      return appointments;
    }

    throw new ForbiddenException("Invalid user role");
  }

  public async getNewAppointmentsForWebSocket(): Promise<IWebSocketAppointmentsOutput> {
    const findOptionsAppointment = this.appointmentQueryOptions.getNewAppointmentsForWebSocketOptions(this.lastChecked);
    const findOptionsAppointmentGroup = this.appointmentQueryOptions.getNewAppointmentGroupsForWebSocketOptions(
      this.lastChecked,
    );
    const findOptionsRedFlagAppointment = this.appointmentQueryOptions.getNewRedFlagAppointmentsForWebSocketOptions(
      this.lastChecked,
    );
    const findOptionsRedFlagAppointmentGroup =
      this.appointmentQueryOptions.getNewRedFlagAppointmentGroupsForWebSocketOptions(this.lastChecked);

    const newAppointment = await this.getAll(findOptionsAppointment);
    const newAppointmentGroups = await this.getAll(findOptionsAppointmentGroup);
    const newRedFlagAppointment = await this.getAll(findOptionsRedFlagAppointment);
    const newRedFlagAppointmentGroups = await this.getAll(findOptionsRedFlagAppointmentGroup);

    this.lastChecked = new Date();

    return {
      newAppointments: newAppointment,
      newAppointmentGroups: newAppointmentGroups,
      newRedFlagAppointments: newRedFlagAppointment,
      newRedFlagAppointmentGroups: newRedFlagAppointmentGroups,
    };
  }

  private async getAll(findOneOptions: FindManyOptions<Appointment>): Promise<Appointment[]> {
    return await this.appointmentRepository.find(findOneOptions);
  }

  public async getAppointmentGroupWithRedFlagForWebSocket(appointmentsGroupId: string): Promise<Appointment[]> {
    const findOptions = this.appointmentQueryOptions.getAppointmentGroupRedFlagForWebSocketOptions(appointmentsGroupId);

    return await this.getAll(findOptions);
  }

  public async getFirstScheduledAppointment(groupPlatformId: string): Promise<Appointment> {
    const queryOptions = this.appointmentQueryOptions.getFirstScheduledAppointmentOptions(groupPlatformId);
    const firstScheduledAppointment = await findOneOrFail(
      groupPlatformId,
      this.appointmentRepository,
      queryOptions,
      "groupPlatformId",
    );

    return firstScheduledAppointment;
  }

  public async getUsersPendingOnDemandAppointments(userRoleIds: string[]): Promise<Appointment[]> {
    const statusesToBroadcast: EAppointmentStatus[] = [
      EAppointmentStatus.PENDING_PAYMENT_CONFIRMATION,
      EAppointmentStatus.PENDING,
      EAppointmentStatus.CANCELLED_BY_SYSTEM,
    ];
    const thresholdTime = subMinutes(new Date(), NUMBER_OF_MINUTES_IN_FIVE_MINUTES);

    const queryOptions = this.appointmentQueryOptions.getUsersPendingOnDemandAppointmentsOptions(
      userRoleIds,
      statusesToBroadcast,
      thresholdTime,
    );
    const appointments = await this.appointmentRepository.find(queryOptions);

    return appointments;
  }
}

import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOneOptions, In, IsNull, Not, Repository } from "typeorm";
import { Blacklist } from "src/modules/blacklists/entities";
import { CreateBlacklistDto, UpdateBlacklistDto } from "src/modules/blacklists/common/dto";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { findOneOrFail, isInRoles } from "src/common/utils";
import { EAppointmentStatus } from "src/modules/appointments/appointment/common/enums";
import { IMessageOutput } from "src/common/outputs";
import { INTERPRETER_ROLES } from "src/common/constants";
import { AccessControlService } from "src/modules/access-control/services";
import { EBlacklistErrorCodes } from "src/modules/blacklists/common/enums";

@Injectable()
export class BlacklistService {
  private readonly MAX_BLACKLISTS: number = 2;

  constructor(
    @InjectRepository(Blacklist)
    private readonly blacklistRepository: Repository<Blacklist>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    private readonly accessControlService: AccessControlService,
  ) {}

  public async checkAndCreateBlacklist(
    appointmentId: string,
    _dto: CreateBlacklistDto,
    user: ITokenUserData,
  ): Promise<IMessageOutput | void> {
    const queryOptions: FindOneOptions<Appointment> = {
      select: {
        id: true,
        platformId: true,
        status: true,
        client: {
          id: true,
        },
        interpreter: {
          id: true,
        },
        blacklists: {
          id: true,
          blockedByUserRoleId: true,
        },
      },
      where: {
        id: appointmentId,
        status: In([EAppointmentStatus.COMPLETED, EAppointmentStatus.NO_SHOW]),
        client: Not(IsNull()),
        interpreter: Not(IsNull()),
      },
      relations: {
        client: true,
        interpreter: true,
        blacklists: true,
      },
    };

    const appointment = await findOneOrFail(appointmentId, this.appointmentRepository, queryOptions);
    const blacklists = appointment.blacklists || [];

    if (blacklists.length === this.MAX_BLACKLISTS) {
      throw new BadRequestException(EBlacklistErrorCodes.SERVICE_BLACKLIST_ALREADY_EXISTS);
    }

    if (blacklists.length === 1) {
      const existingBlacklist = blacklists[0];

      if (existingBlacklist.blockedByUserRoleId === user.userRoleId) {
        throw new BadRequestException(EBlacklistErrorCodes.SERVICE_BLACKLIST_ALREADY_EXISTS);
      }
    }

    return await this.constructAndCreateBlacklist(appointment, user);
  }

  private async constructAndCreateBlacklist(appointment: Appointment, user: ITokenUserData): Promise<IMessageOutput> {
    const blacklist = await this.constructBlacklist(appointment, user);

    return await this.createBlacklist(blacklist);
  }

  private async createBlacklist(blacklist: Partial<Blacklist>): Promise<IMessageOutput> {
    const newBlacklist = this.blacklistRepository.create(blacklist);
    await this.blacklistRepository.save(newBlacklist);

    return { message: "Blacklist created successfully" };
  }

  private async constructBlacklist(appointment: Appointment, user: ITokenUserData): Promise<Partial<Blacklist>> {
    if (!appointment.client || !appointment.interpreter) {
      throw new BadRequestException(EBlacklistErrorCodes.SERVICE_CLIENT_OR_INTERPRETER_MISSING);
    }

    let blockedByUserRole = appointment.client;
    let blockedUserRole = appointment.interpreter;

    if (isInRoles(INTERPRETER_ROLES, user.role)) {
      blockedByUserRole = appointment.interpreter;
      blockedUserRole = appointment.client;
    }

    return {
      appointment: appointment,
      blockedByUserRole: blockedByUserRole,
      blockedUserRole: blockedUserRole,
    };
  }

  public async updateBlacklist(
    appointmentId: string,
    dto: UpdateBlacklistDto,
    user: ITokenUserData,
  ): Promise<IMessageOutput> {
    const blacklist = await this.blacklistRepository.findOne({
      select: {
        id: true,
        appointment: { id: true, clientId: true, operatedByCompanyId: true, operatedByMainCorporateCompanyId: true },
      },
      where: { appointment: { id: appointmentId } },
      relations: { appointment: true },
    });

    if (!blacklist) {
      throw new NotFoundException(EBlacklistErrorCodes.SERVICE_BLACKLIST_NOT_FOUND);
    }

    await this.accessControlService.authorizeUserRoleForAppointmentOperation(user, blacklist.appointment);
    await this.blacklistRepository.update(blacklist.id, { isActive: dto.isActive });

    return { message: "Blacklist updated successfully" };
  }

  public async deleteBlacklist(id: string, user: ITokenUserData): Promise<void> {
    const queryOptions: FindOneOptions<Blacklist> = {
      select: { id: true },
      where: { id: id, blockedByUserRoleId: user.userRoleId },
    };
    const blacklist = await findOneOrFail(id, this.blacklistRepository, queryOptions);

    await this.blacklistRepository.remove(blacklist);
  }
}

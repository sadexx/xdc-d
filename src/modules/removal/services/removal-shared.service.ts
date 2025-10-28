import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { randomUUID } from "crypto";
import { Brackets, Repository, SelectQueryBuilder } from "typeorm";
import { COMPANY_ADMIN_ROLES, NUMBER_OF_SECONDS_IN_DAY, NUMBER_OF_MILLISECONDS_IN_SECOND } from "src/common/constants";
import { isInRoles, findOneOrFailTyped } from "src/common/utils";
import { AccessControlService } from "src/modules/access-control/services";
import { Company } from "src/modules/companies/entities";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { EUserRoleName } from "src/modules/users/common/enums";
import { UserRole } from "src/modules/users/entities";
import { IRestorationConfig } from "src/modules/removal/common/interfaces";
import {
  TResolveEmailRecipient,
  TResolveEmailRecipientAdmin,
  TResolveEmailRecipientCompany,
} from "src/modules/removal/common/types";
import { RemovalQueryOptionsService } from "src/modules/removal/services";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { EAppointmentStatus } from "src/modules/appointments/appointment/common/enums";
import { COMPLETED_APPOINTMENT_STATUSES } from "src/modules/appointments/shared/common/constants";
import { ERemovalErrorCodes } from "src/modules/removal/common/enums";

@Injectable()
export class RemovalSharedService {
  constructor(
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    private readonly removalQueryOptionsService: RemovalQueryOptionsService,
    private readonly configService: ConfigService,
    private readonly accessControlService: AccessControlService,
  ) {}

  public async checkIfUserHasUncompletedAppointmentsBeforeDelete(userRoleId: string): Promise<void> {
    const statuses = await this.getUniqueUncompletedAppointmentStatuses((qb) => {
      qb.leftJoin("appointment.client", "client")
        .leftJoin("appointment.interpreter", "interpreter")
        .andWhere("(client.id = :userRoleId OR interpreter.id = :userRoleId)", { userRoleId });
    });

    if (statuses.length > 0) {
      throw new BadRequestException({
        message: ERemovalErrorCodes.USER_HAS_UNCOMPLETED_APPOINTMENTS,
        uncompletedAppointmentStatuses: statuses,
      });
    }
  }

  public async checkIfCompanyHasUncompletedAppointmentsBeforeDelete(companyId: string): Promise<void> {
    const statuses = await this.getUniqueUncompletedAppointmentStatuses((qb) => {
      qb.leftJoin("appointment.interpreter", "interpreter").andWhere(
        new Brackets((queryBuilder) => {
          queryBuilder
            .where(
              "(appointment.operatedByCompanyId = :companyId OR appointment.operatedByMainCorporateCompanyId = :companyId)",
              { companyId },
            )
            .orWhere(
              "(interpreter.operatedByCompanyId = :companyId OR interpreter.operatedByMainCorporateCompanyId = :companyId)",
              { companyId },
            );
        }),
      );
    });

    if (statuses.length > 0) {
      throw new BadRequestException({
        message: ERemovalErrorCodes.COMPANY_HAS_UNCOMPLETED_APPOINTMENTS,
        uncompletedAppointmentStatuses: statuses,
      });
    }
  }

  private async getUniqueUncompletedAppointmentStatuses(
    addConditions: (qb: SelectQueryBuilder<Appointment>) => void,
  ): Promise<EAppointmentStatus[]> {
    const qb = this.appointmentRepository
      .createQueryBuilder("appointment")
      .select("DISTINCT appointment.status", "status")
      .where("appointment.status NOT IN (:...completedStatuses)", {
        completedStatuses: COMPLETED_APPOINTMENT_STATUSES,
      });
    addConditions(qb);

    const results = await qb.getRawMany<Appointment>();

    return results.map((appointment) => appointment.status);
  }

  public async resolveEmailRecipient(userRole: TResolveEmailRecipient, user: ITokenUserData): Promise<string> {
    const queryOptions = this.removalQueryOptionsService.resolveEmailRecipientOptions(
      user.userRoleId,
      userRole.operatedByCompanyId,
    );

    let emailToSendRestorationLink = userRole.profile.contactEmail;

    if (isInRoles(COMPANY_ADMIN_ROLES, user.role)) {
      const admin = await findOneOrFailTyped<TResolveEmailRecipientAdmin>(
        user.userRoleId,
        this.userRoleRepository,
        queryOptions.admin,
      );
      const company = await findOneOrFailTyped<TResolveEmailRecipientCompany>(
        userRole.operatedByCompanyId,
        this.companyRepository,
        queryOptions.company,
      );

      await this.accessControlService.authorizeUserRoleForCompanyOperation(user, company);

      emailToSendRestorationLink = admin.profile.contactEmail;
    }

    if (user.role === EUserRoleName.SUPER_ADMIN) {
      const superAdmin = await findOneOrFailTyped<TResolveEmailRecipientAdmin>(
        user.userRoleId,
        this.userRoleRepository,
        queryOptions.admin,
      );

      emailToSendRestorationLink = superAdmin.profile.contactEmail;
    }

    return emailToSendRestorationLink;
  }

  public constructRestorationConfig(): IRestorationConfig {
    const restoringPeriodInSeconds = this.configService.getOrThrow<number>("jwt.restore.expirationTimeSeconds");
    const restorationKey = randomUUID();
    const linkDurationString = restoringPeriodInSeconds / NUMBER_OF_SECONDS_IN_DAY + " days";
    const deletingDate = new Date(new Date().getTime() + restoringPeriodInSeconds * NUMBER_OF_MILLISECONDS_IN_SECOND);

    return {
      restoringPeriodInSeconds,
      restorationKey,
      linkDurationString,
      deletingDate,
    };
  }
}

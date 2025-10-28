import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  ACCOUNT_STATUSES_ALLOWED_TO_IMMEDIATELY_DELETING,
  CORPORATE_ADMIN_ROLES,
  CORPORATE_SUPER_ADMIN_ROLES,
} from "src/common/constants";
import { Company } from "src/modules/companies/entities";
import { HelperService } from "src/modules/helper/services";
import { EUserRoleName } from "src/modules/users/common/enums";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { UserRole } from "src/modules/users/entities";
import { User } from "src/modules/users/entities";
import { findOneOrFailTyped, isInRoles } from "src/common/utils";
import {
  RemovalNotificationService,
  RemovalQueryOptionsService,
  RemovalService,
  RemovalSharedService,
} from "src/modules/removal/services";
import { IRestorationConfig } from "src/modules/removal/common/interfaces";
import { AccessControlService } from "src/modules/access-control/services";
import { TRemoveUserRequest, TRemoveUserRoleRequest } from "src/modules/removal/common/types";
import { RemoveCompanyDto } from "src/modules/removal/common/dto";
import { ECommonErrorCodes } from "src/common/enums";
import { ERemovalErrorCodes } from "src/modules/removal/common/enums";

@Injectable()
export class RemovalRequestService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly removalQueryOptionsService: RemovalQueryOptionsService,
    private readonly removalNotificationService: RemovalNotificationService,
    private readonly removalSharedService: RemovalSharedService,
    private readonly removalService: RemovalService,
    private readonly helperService: HelperService,
    private readonly accessControlService: AccessControlService,
  ) {}

  /**
   ** Remove User Request
   */

  public async removeUserRequest(id: string, user: ITokenUserData): Promise<void> {
    const queryOptions = this.removalQueryOptionsService.removeUserRequestOptions(id);
    const targetUser = await findOneOrFailTyped<TRemoveUserRequest>(id, this.userRepository, queryOptions);

    if (targetUser.id !== user.id && user.role !== EUserRoleName.SUPER_ADMIN) {
      throw new ForbiddenException(ECommonErrorCodes.ACCESS_FORBIDDEN_REQUEST);
    }

    await this.checkUserUncompletedAppointments(targetUser);

    const rolesToMarkForRemove = targetUser.userRoles.filter(
      (role) => !ACCOUNT_STATUSES_ALLOWED_TO_IMMEDIATELY_DELETING.includes(role.accountStatus),
    );

    if (rolesToMarkForRemove.length === 0) {
      return await this.handleUserImmediateRemoval(targetUser);
    }

    const [targetUserRole] = rolesToMarkForRemove;
    const emailToSendRestorationLink = await this.removalSharedService.resolveEmailRecipient(targetUserRole, user);

    if (!emailToSendRestorationLink) {
      throw new BadRequestException(ERemovalErrorCodes.EMAIL_NOT_FILLED);
    }

    const restorationConfig = this.removalSharedService.constructRestorationConfig();
    await this.markUserForRemove(targetUser, restorationConfig);

    const isSelfDeleting = targetUser.id === user.id;
    await this.removalNotificationService.sendUserRemovalRequestEmail(
      emailToSendRestorationLink,
      targetUserRole,
      restorationConfig,
      isSelfDeleting,
    );
  }

  private async checkUserUncompletedAppointments(targetUser: TRemoveUserRequest): Promise<void> {
    for (const userRole of targetUser.userRoles) {
      await this.removalSharedService.checkIfUserHasUncompletedAppointmentsBeforeDelete(userRole.id);
    }

    if (targetUser.administratedCompany) {
      await this.removalSharedService.checkIfCompanyHasUncompletedAppointmentsBeforeDelete(
        targetUser.administratedCompany.id,
      );
    }
  }

  private async handleUserImmediateRemoval(targetUser: TRemoveUserRequest): Promise<void> {
    if (targetUser.administratedCompany) {
      await this.removalService.removeCompany(targetUser.administratedCompany);
    } else {
      await this.removalService.removeUser(targetUser.id);
    }
  }

  private async markUserForRemove(user: TRemoveUserRequest, restorationConfig: IRestorationConfig): Promise<void> {
    await this.userRoleRepository.update({ user: { id: user.id } }, { isInDeleteWaiting: true });
    await this.userRepository.update(
      { id: user.id },
      {
        isInDeleteWaiting: true,
        deletingDate: restorationConfig.deletingDate,
        restorationKey: restorationConfig.restorationKey,
      },
    );

    if (user.administratedCompany) {
      await this.markCompanyForRemove(user.administratedCompany.id, { removeAllAdminRoles: true }, restorationConfig);
    }
  }

  /**
   ** Remove UserRole Request
   */

  public async removeUserRoleRequest(userRoleId: string, user: ITokenUserData): Promise<void> {
    const queryOptions = this.removalQueryOptionsService.removeUserRoleRequestOptions(userRoleId);
    const targetUserRole = await findOneOrFailTyped<TRemoveUserRoleRequest>(
      userRoleId,
      this.userRoleRepository,
      queryOptions,
    );

    await this.checkUserRoleUncompletedAppointments(targetUserRole);

    if (ACCOUNT_STATUSES_ALLOWED_TO_IMMEDIATELY_DELETING.includes(targetUserRole.accountStatus)) {
      return this.handleUserRoleImmediateRemoval(targetUserRole);
    }

    const emailToSendRestorationLink = await this.removalSharedService.resolveEmailRecipient(targetUserRole, user);

    if (!emailToSendRestorationLink) {
      throw new BadRequestException(ERemovalErrorCodes.EMAIL_NOT_FILLED);
    }

    if (
      !isInRoles([EUserRoleName.SUPER_ADMIN, ...CORPORATE_SUPER_ADMIN_ROLES, ...CORPORATE_ADMIN_ROLES], user.role) &&
      targetUserRole.userId !== user.id
    ) {
      throw new ForbiddenException(ECommonErrorCodes.ACCESS_FORBIDDEN_REQUEST);
    }

    await this.accessControlService.authorizeUserRoleForOperation(user, targetUserRole);

    const restorationConfig = this.removalSharedService.constructRestorationConfig();
    await this.markUserRoleForRemove(targetUserRole, restorationConfig);

    const isSelfDeleting = targetUserRole.id === user.userRoleId;
    await this.removalNotificationService.sendUserRemovalRequestEmail(
      emailToSendRestorationLink,
      targetUserRole,
      restorationConfig,
      isSelfDeleting,
      targetUserRole.role.name,
    );
  }

  private async checkUserRoleUncompletedAppointments(targetUserRole: TRemoveUserRoleRequest): Promise<void> {
    await this.removalSharedService.checkIfUserHasUncompletedAppointmentsBeforeDelete(targetUserRole.id);

    if (isInRoles(CORPORATE_SUPER_ADMIN_ROLES, targetUserRole.role.name) && targetUserRole.user.administratedCompany) {
      await this.removalSharedService.checkIfCompanyHasUncompletedAppointmentsBeforeDelete(
        targetUserRole.user.administratedCompany.id,
      );
    }
  }

  private async handleUserRoleImmediateRemoval(targetUserRole: TRemoveUserRoleRequest): Promise<void> {
    if (isInRoles(CORPORATE_SUPER_ADMIN_ROLES, targetUserRole.role.name) && targetUserRole.user.administratedCompany) {
      await this.removalService.removeCompany(targetUserRole.user.administratedCompany);
    } else {
      if (targetUserRole.user.userRoles.length > 1) {
        await this.removalService.removeUserRole(targetUserRole.id);
      } else {
        await this.removalService.removeUser(targetUserRole.userId);
      }
    }
  }

  private async markUserRoleForRemove(
    targetUserRole: TRemoveUserRoleRequest,
    restorationConfig: IRestorationConfig,
  ): Promise<void> {
    await this.userRoleRepository.update(
      { id: targetUserRole.id },
      {
        isInDeleteWaiting: true,
        deletingDate: restorationConfig.deletingDate,
        restorationKey: restorationConfig.restorationKey,
      },
    );

    if (isInRoles(CORPORATE_SUPER_ADMIN_ROLES, targetUserRole.role.name) && targetUserRole.user.administratedCompany) {
      await this.markCompanyForRemove(
        targetUserRole.user.administratedCompany.id,
        { removeAllAdminRoles: false },
        restorationConfig,
      );
    }
  }

  /**
   ** Remove Company Request
   */

  public async removeCompanyRequest(dto: RemoveCompanyDto, user: ITokenUserData): Promise<void> {
    const company = await this.accessControlService.getCompanyByRole(
      user,
      { superAdmin: { userRoles: { role: true, user: true } } },
      dto.id,
    );

    if (!company) {
      throw new NotFoundException(ERemovalErrorCodes.COMPANY_NOT_FOUND);
    }

    if (!company.adminEmail || !company.adminName || !company.superAdmin) {
      throw new BadRequestException(ERemovalErrorCodes.ADMIN_DATA_NOT_FILLED);
    }

    await this.removalSharedService.checkIfCompanyHasUncompletedAppointmentsBeforeDelete(company.id);

    const restorationConfig = this.removalSharedService.constructRestorationConfig();
    await this.markCompanyForRemove(company.id, dto, restorationConfig);

    const superAdminRole = await this.helperService.getUserRoleByName<UserRole>(
      company.superAdmin,
      CORPORATE_SUPER_ADMIN_ROLES,
    );

    await this.removalNotificationService.sendCompanyRemovalRequestEmail(
      company.adminEmail,
      superAdminRole,
      restorationConfig,
      company,
    );
  }

  private async markCompanyForRemove(
    companyId: string,
    dto: RemoveCompanyDto,
    restorationConfig: IRestorationConfig,
  ): Promise<void> {
    await this.companyRepository.update(
      { id: companyId },
      {
        removeAllAdminRoles: dto.removeAllAdminRoles,
        isInDeleteWaiting: true,
        deletingDate: restorationConfig.deletingDate,
      },
    );
    await this.companyRepository.update(
      { operatedByMainCompanyId: companyId },
      {
        removeAllAdminRoles: dto.removeAllAdminRoles,
        isInDeleteWaiting: true,
        deletingDate: restorationConfig.deletingDate,
      },
    );
  }
}

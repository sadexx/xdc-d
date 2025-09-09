import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  ADMIN_ROLES,
  COMPANY_ADMIN_ROLES,
  CORPORATE_INTERPRETING_PROVIDERS_COMPANY_ADMIN_ROLES,
  LFH_ADMIN_ROLES,
  NUMBER_OF_SECONDS_IN_HOUR,
  UNDEFINED_VALUE,
} from "src/common/constants";
import { findOneOrFail, isInRoles } from "src/common/utils";
import { ECompanyType } from "src/modules/companies/common/enums";
import { Company } from "src/modules/companies/entities";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { UserRole } from "src/modules/users/entities";
import { FindOptionsRelations, Repository } from "typeorm";
import {
  AdminIdentifierInput,
  TAppointmentMapping,
  TCompanyMapping,
  TCompanyOwned,
  TOperationExecutor,
  TTargetEntity,
  TTargetEntityMapping,
  TUserRoleMapping,
} from "src/modules/access-control/common/types";
import { LokiLogger } from "src/common/logger";
import { RedisService } from "src/modules/redis/services";
import { ICorporateAdminCacheData } from "src/modules/access-control/common/interfaces";

@Injectable()
export class AccessControlService {
  private readonly lokiLogger = new LokiLogger(AccessControlService.name);

  constructor(
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly redisService: RedisService,
  ) {}

  public checkLfhAdminRoleForOperation(user: ITokenUserData): boolean {
    if (isInRoles(LFH_ADMIN_ROLES, user.role)) {
      return true;
    }

    return false;
  }

  public checkAdminRoleForOperation(dto: AdminIdentifierInput, user: ITokenUserData): boolean {
    const isAdminOperation =
      ("userRoleId" in dto && dto.userRoleId !== UNDEFINED_VALUE) || ("id" in dto && dto.id !== UNDEFINED_VALUE);

    if (isAdminOperation) {
      if (!isInRoles(ADMIN_ROLES, user.role)) {
        this.lokiLogger.error(`Unauthorized access attempt by user: ${user.userRoleId}, role: ${user.role}`);
        throw new ForbiddenException("Admin role required for this operation!");
      }
    }

    return isAdminOperation;
  }

  public async authorizeUserRoleForOperation(user: ITokenUserData, targetUserRole: TUserRoleMapping): Promise<void> {
    if (targetUserRole.id === user.userRoleId) {
      return;
    }

    if (isInRoles(LFH_ADMIN_ROLES, user.role)) {
      return;
    }

    if (isInRoles(COMPANY_ADMIN_ROLES, user.role)) {
      await this.checkCorporateAdminAccess(user, {
        id: targetUserRole.id,
        operatedByCompanyId: targetUserRole.operatedByCompanyId,
        operatedByMainCorporateCompanyId: targetUserRole.operatedByMainCorporateCompanyId,
      });

      return;
    } else {
      this.lokiLogger.error(
        `Unauthorized access attempt by user: ${user.userRoleId}, role: ${user.role}, targetUserRole: ${targetUserRole.id}`,
      );
      throw new ForbiddenException("Insufficient privileges for this operation!");
    }
  }

  public async authorizeUserRoleForCompanyOperation(
    user: ITokenUserData,
    targetCompany: TCompanyMapping,
  ): Promise<void> {
    if (isInRoles(LFH_ADMIN_ROLES, user.role)) {
      return;
    }

    if (isInRoles(COMPANY_ADMIN_ROLES, user.role)) {
      await this.checkCorporateAdminAccess(user, {
        id: targetCompany.id,
        operatedByCompanyId: targetCompany.id,
        operatedByMainCorporateCompanyId: targetCompany.operatedByMainCompanyId,
      });

      return;
    } else {
      this.lokiLogger.error(
        `Unauthorized access attempt by user: ${user.userRoleId}, role: ${user.role}, targetCompany: ${targetCompany.id}`,
      );
      throw new ForbiddenException("Insufficient privileges for this operation!");
    }
  }

  public async authorizeUserRoleForAppointmentOperation(
    user: ITokenUserData,
    targetAppointment: TAppointmentMapping,
  ): Promise<void> {
    if (targetAppointment.clientId === user.userRoleId) {
      return;
    }

    if (isInRoles(LFH_ADMIN_ROLES, user.role)) {
      return;
    }

    if (isInRoles(COMPANY_ADMIN_ROLES, user.role)) {
      await this.checkCorporateAdminAccess(user, {
        id: targetAppointment.id,
        operatedByCompanyId: targetAppointment.operatedByCompanyId,
        operatedByMainCorporateCompanyId: targetAppointment.operatedByMainCorporateCompanyId,
      });

      return;
    } else {
      this.lokiLogger.error(
        `Unauthorized access attempt by user: ${user.userRoleId}, role: ${user.role}, targetAppointment: ${targetAppointment.id}`,
      );
      throw new ForbiddenException("Insufficient privileges for this operation!");
    }
  }

  private async checkCorporateAdminAccess(user: ITokenUserData, targetEntity: TTargetEntity): Promise<void> {
    const cacheKey = `check-corporate-admins:${user.userRoleId}`;
    let adminUserRole = await this.redisService.getJson<ICorporateAdminCacheData>(cacheKey);

    if (!adminUserRole) {
      adminUserRole = await findOneOrFail(
        user.userRoleId,
        this.userRoleRepository,
        {
          select: { id: true, operatedByCompanyId: true, operatedByMainCorporateCompanyId: true },
          where: { id: user.userRoleId },
        },
        "userRoleId",
        "Company admin not found!",
      );

      await this.redisService.setJson(cacheKey, adminUserRole, NUMBER_OF_SECONDS_IN_HOUR);
    }

    if (isInRoles(CORPORATE_INTERPRETING_PROVIDERS_COMPANY_ADMIN_ROLES, user.role)) {
      this.validateCompanyHierarchyAccess(adminUserRole, targetEntity);

      return;
    }

    this.validateSameCompanyAccess(adminUserRole, targetEntity);
  }

  private validateCompanyHierarchyAccess(adminRole: TOperationExecutor, targetEntity: TTargetEntity): void {
    const hasSameCompanyAccess = adminRole.operatedByCompanyId === targetEntity.operatedByCompanyId;
    const hasParentCompanyAccess = adminRole.operatedByCompanyId === targetEntity.operatedByMainCorporateCompanyId;

    if (hasSameCompanyAccess || hasParentCompanyAccess) {
      return;
    }

    this.lokiLogger.error(
      `Attempt to access data from different company, Identified:${adminRole.id ?? adminRole.userRoleId}, RequestedId:${targetEntity.id}`,
    );
    throw new BadRequestException("Cannot access data from different companies!");
  }

  public validateSameCompanyAccess(targetUserRole: TOperationExecutor, targetEntity: TCompanyOwned): void {
    if (targetUserRole.operatedByCompanyId !== targetEntity.operatedByCompanyId) {
      this.lokiLogger.error(
        `Attempt to access data from different company, Identified:${targetUserRole.id ?? targetUserRole.userRoleId}, RequestedId:${targetEntity.id}`,
      );
      throw new BadRequestException("Cannot access data from different companies!");
    }
  }

  public validateParentCompanyAccess(targetUserRole: TOperationExecutor, targetEntity: TTargetEntityMapping): void {
    const resolvedMainCompanyId =
      "operatedByMainCorporateCompanyId" in targetEntity
        ? targetEntity.operatedByMainCorporateCompanyId
        : targetEntity.operatedByMainCompanyId;

    if (targetUserRole.operatedByCompanyId !== resolvedMainCompanyId) {
      this.lokiLogger.error(
        `Attempt to access data from different company, Identified:${targetUserRole.id ?? targetUserRole.userRoleId}, RequestedId:${targetEntity.id}`,
      );
      throw new BadRequestException("Cannot access data from different companies!");
    }
  }

  public async getCompanyByRole(
    user: ITokenUserData,
    relations: FindOptionsRelations<Company>,
    companyId?: string,
  ): Promise<Company | null> {
    if (isInRoles(LFH_ADMIN_ROLES, user.role)) {
      return await this.getCompanyByRoleLfhPersonal(relations, companyId);
    } else if (isInRoles(CORPORATE_INTERPRETING_PROVIDERS_COMPANY_ADMIN_ROLES, user.role)) {
      return await this.getCompanyByRoleCorporateInterpretingProvider(user, relations, companyId);
    } else {
      return await this.getOwnCompanyByRole(user, relations);
    }
  }

  private async getCompanyByRoleLfhPersonal(
    relations: FindOptionsRelations<Company>,
    companyId?: string,
  ): Promise<Company | null> {
    if (!companyId) {
      throw new BadRequestException("Please, set company id!");
    }

    return await this.companyRepository.findOne({
      where: { id: companyId },
      relations,
    });
  }

  private async getCompanyByRoleCorporateInterpretingProvider(
    user: ITokenUserData,
    relations: FindOptionsRelations<Company>,
    companyId?: string,
  ): Promise<Company | null> {
    if (companyId) {
      return await this.getCompanyByRoleCorporateInterpretingProviderCorporateClient(user, relations, companyId);
    } else {
      return await this.getOwnCompanyByRole(user, relations);
    }
  }

  private async getCompanyByRoleCorporateInterpretingProviderCorporateClient(
    user: ITokenUserData,
    relations: FindOptionsRelations<Company>,
    companyId?: string,
  ): Promise<Company | null> {
    const personalUserRole = await this.userRoleRepository.findOne({
      select: { id: true, operatedByCompanyId: true },
      where: { id: user.userRoleId },
    });

    if (!personalUserRole) {
      throw new BadRequestException("Operator company admin not exist!");
    }

    const company = await this.companyRepository.findOne({
      where: { id: companyId },
      relations,
    });

    if (!company) {
      throw new BadRequestException("Company not exist!");
    }

    if (company.companyType === ECompanyType.CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS) {
      if (company.operatedByMainCompanyId !== personalUserRole.operatedByCompanyId) {
        throw new ForbiddenException("Forbidden request!");
      }
    } else {
      if (company.id !== personalUserRole.operatedByCompanyId) {
        throw new ForbiddenException("Forbidden request!");
      }
    }

    return company;
  }

  private async getOwnCompanyByRole(
    user: ITokenUserData,
    relations: FindOptionsRelations<Company>,
  ): Promise<Company | null> {
    const personalUserRole = await this.userRoleRepository.findOne({
      select: { id: true, operatedByCompanyId: true },
      where: { id: user.userRoleId },
    });

    if (!personalUserRole) {
      throw new BadRequestException("User not found!");
    }

    return await this.companyRepository.findOne({
      where: { id: personalUserRole.operatedByCompanyId },
      relations,
    });
  }
}

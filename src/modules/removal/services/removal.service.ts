import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { UserRole } from "src/modules/users/entities";
import { UserAvatarsService } from "src/modules/user-avatars/services";
import { User } from "src/modules/users/entities";
import { AwsS3Service } from "src/modules/aws/s3/aws-s3.service";
import { InterpreterBadgeService } from "src/modules/interpreters/badge/services";
import { InjectRepository } from "@nestjs/typeorm";
import { findOneOrFailTyped } from "src/common/utils";
import { Company } from "src/modules/companies/entities";
import { HelperService } from "src/modules/helper/services";
import { CORPORATE_SUPER_ADMIN_ROLES } from "src/common/constants";
import { LokiLogger } from "src/common/logger";
import { TRemoveCompany, TRemoveUser, TRemoveUserRole } from "src/modules/removal/common/types";
import { RemovalQueryOptionsService } from "src/modules/removal/services";

@Injectable()
export class RemovalService {
  private readonly lokiLogger = new LokiLogger(RemovalService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly removalQueryOptionsService: RemovalQueryOptionsService,
    private readonly userAvatarsService: UserAvatarsService,
    private readonly awsS3Service: AwsS3Service,
    private readonly interpreterBadgeService: InterpreterBadgeService,
    private readonly helperService: HelperService,
  ) {}

  public async removeUser(userId: string): Promise<void> {
    const queryOptions = this.removalQueryOptionsService.removeUserOptions(userId);
    const user = await findOneOrFailTyped<TRemoveUser>(userId, this.userRepository, queryOptions);

    if (user.avatarUrl && !user.isDefaultAvatar) {
      await this.userAvatarsService.removeAvatarFromS3(user.avatarUrl);
    }

    if (user.avatar && user.avatar.avatarUrl) {
      await this.userAvatarsService.removeAvatarFromS3(user.avatar.avatarUrl);
    }

    for (const userRole of user.userRoles) {
      await this.removeUserRole(userRole.id);
    }

    await this.userRepository.remove(user as User);
  }

  public async removeUserRole(userRoleId: string): Promise<void> {
    const queryOptions = this.removalQueryOptionsService.removeUserRoleOptions(userRoleId);
    const userRole = await findOneOrFailTyped<TRemoveUserRole>(userRoleId, this.userRoleRepository, queryOptions);

    await this.removeUserRoleDocuments(userRole.documents);

    if (userRole.interpreterProfile && userRole.interpreterProfile.interpreterBadgePdf) {
      await this.interpreterBadgeService.removeInterpreterBadgePdf(userRole.interpreterProfile.interpreterBadgePdf);
    }

    await this.userRoleRepository.remove(userRole as UserRole);
  }

  private async removeUserRoleDocuments(documents: TRemoveUserRole["documents"]): Promise<void> {
    if (!documents || documents.length === 0) {
      return;
    }

    const documentKeys = documents.filter((doc) => doc.s3Key).map((doc) => doc.s3Key);
    const objectIdentifiers = documentKeys.map((key) => ({ Key: key }));

    if (objectIdentifiers.length > 0) {
      await this.awsS3Service.deleteObjects(objectIdentifiers);
    }
  }

  public async removeCompany(company: TRemoveCompany): Promise<void> {
    const deletePromises: Promise<void>[] = [];

    await this.companyRepository.delete({ id: company.id });

    if (!company.superAdminId || !company.superAdmin) {
      this.lokiLogger.error(`Company ${company.id} does not have superAdminId`);
    } else if (company.removeAllAdminRoles) {
      deletePromises.push(this.removeUser(company.superAdminId));
    } else {
      if (company.superAdmin.userRoles.length <= 1) {
        deletePromises.push(this.removeUser(company.superAdminId));
      }

      if (company.superAdmin.userRoles.length > 1) {
        const superAdminRole = await this.helperService.getUserRoleByName<UserRole>(
          company.superAdmin,
          CORPORATE_SUPER_ADMIN_ROLES,
        );
        deletePromises.push(this.removeUserRole(superAdminRole.id));
      }
    }

    const companyEmployees = await this.userRoleRepository.find({
      where: { operatedByCompanyId: company.id },
      relations: { user: { userRoles: true }, interpreterProfile: true },
    });

    for (const employee of companyEmployees) {
      if (employee.user.userRoles.length > 1) {
        deletePromises.push(this.removeUserRole(employee.id));
      }

      if (employee.user.userRoles.length <= 1) {
        deletePromises.push(this.removeUser(employee.userId));
      }
    }

    this.lokiLogger.log(
      `removeCompanies, count of deleting users or userRoles for company ${company.id}: ${deletePromises.length}`,
    );

    const resolvedPromises = (await Promise.allSettled(deletePromises))
      .filter((settledPromise): settledPromise is PromiseFulfilledResult<void> => settledPromise.status === "fulfilled")
      .map((fulfilledPromise) => fulfilledPromise.value);

    if (deletePromises.length > 0) {
      this.lokiLogger.log(
        `removeCompanies, count of deleted users or userRoles with success: ${resolvedPromises.length}`,
      );
      this.lokiLogger.log(
        `removeCompanies, count of deleted users or userRoles with error: ${deletePromises.length - resolvedPromises.length}`,
      );
    }
  }
}

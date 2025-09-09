import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Company } from "src/modules/companies/entities";
import { Repository } from "typeorm";
import { UserRole } from "src/modules/users/entities";
import { subDays } from "date-fns";
import { CORPORATE_SUPER_ADMIN_ROLES } from "src/common/constants";
import { LokiLogger } from "src/common/logger";
import { RemovalQueryOptionsService, RemovalService } from "src/modules/removal/services";
import { User } from "src/modules/users/entities";
import { findManyTyped, isInRoles } from "src/common/utils";
import {
  TRemoveCompanies,
  TRemoveUnfinishedRegistrationUserRoles,
  TRemoveUserRoles,
  TRemoveUsers,
} from "src/modules/removal/common/types";

@Injectable()
export class RemovalSchedulerService {
  private readonly lokiLogger = new LokiLogger(RemovalSchedulerService.name);
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly removalQueryOptionsService: RemovalQueryOptionsService,
    private readonly removalService: RemovalService,
  ) {}

  public async processScheduledRemovals(): Promise<void> {
    this.lokiLogger.log(`Cron autoProcessScheduledRemovals started.`);
    await this.removeUserRoles();
    await this.removeUsers();
    await this.removeUnfinishedRegistrationUserRoles();
    await this.removeCompanies();
    this.lokiLogger.log(`Cron autoProcessScheduledRemovals finished.`);
  }

  private async removeUsers(): Promise<void> {
    const queryOptions = this.removalQueryOptionsService.removeUsersOptions();
    const users = await findManyTyped<TRemoveUsers[]>(this.userRepository, queryOptions);

    this.lokiLogger.log(`removeUsers, count of users for deleting: ${users.length}`);

    let successfullyDeleted: number = 0;
    let deletedWithError: number = 0;

    for (const user of users) {
      try {
        const activeRoles = user.userRoles.filter((role) => !role.isInDeleteWaiting);
        const rolesWithOwnTimer = user.userRoles.filter((role) => role.isInDeleteWaiting && role.deletingDate);
        const rolesMarkedThroughUser = user.userRoles.filter((role) => role.isInDeleteWaiting && !role.deletingDate);

        if (activeRoles.length > 0 || rolesWithOwnTimer.length > 0) {
          for (const userRole of rolesMarkedThroughUser) {
            if (user.administratedCompany && isInRoles(CORPORATE_SUPER_ADMIN_ROLES, userRole.role.name)) {
              await this.removalService.removeCompany(user.administratedCompany);
            } else {
              await this.removalService.removeUserRole(userRole.id);
            }
          }

          await this.userRepository.update(
            { id: user.id },
            { isInDeleteWaiting: false, deletingDate: null, restorationKey: null },
          );

          this.lokiLogger.log(`User ${user.id} unmarked for deletion, removed ${rolesMarkedThroughUser.length} roles`);
        } else {
          if (user.administratedCompany) {
            await this.removalService.removeCompany(user.administratedCompany);
          } else {
            await this.removalService.removeUser(user.id);
          }

          successfullyDeleted++;
        }
      } catch (error) {
        this.lokiLogger.error(`Failed to process user ${user.id}`, (error as Error).stack);
        deletedWithError++;

        continue;
      }
    }

    if (users.length > 0) {
      this.lokiLogger.log(`removeUsers success: ${successfullyDeleted}, errors: ${deletedWithError}`);
    }
  }

  private async removeUserRoles(): Promise<void> {
    const queryOptions = this.removalQueryOptionsService.removeUserRolesOptions();
    const userRoles = await findManyTyped<TRemoveUserRoles[]>(this.userRoleRepository, queryOptions);

    this.lokiLogger.log(`removeUserRoles, count of deleting users or userRoles: ${userRoles.length}`);

    let successfullyDeleted: number = 0;
    let deletedWithError: number = 0;

    for (const userRole of userRoles) {
      try {
        if (userRole.user.administratedCompany && isInRoles(CORPORATE_SUPER_ADMIN_ROLES, userRole.role.name)) {
          await this.removalService.removeCompany(userRole.user.administratedCompany);
        } else {
          if (userRole.user.userRoles.length > 1) {
            await this.removalService.removeUserRole(userRole.id);
          } else {
            await this.removalService.removeUser(userRole.userId);
          }
        }

        successfullyDeleted++;
      } catch (error) {
        this.lokiLogger.error(
          `Failed to delete userRole ${userRole.id} (userId: ${userRole.userId})`,
          (error as Error).stack,
        );
        deletedWithError++;

        continue;
      }
    }

    if (userRoles.length > 0) {
      this.lokiLogger.log(`removeUserRoles success: ${successfullyDeleted}, errors: ${deletedWithError}`);
    }
  }

  private async removeUnfinishedRegistrationUserRoles(): Promise<void> {
    const INACTIVE_DAYS_LIMIT = 30;
    const registrationExpiryDate = subDays(new Date(), INACTIVE_DAYS_LIMIT);

    const queryOptions =
      this.removalQueryOptionsService.removeUnfinishedRegistrationUserRolesOptions(registrationExpiryDate);
    const userRoles = await findManyTyped<TRemoveUnfinishedRegistrationUserRoles[]>(
      this.userRoleRepository,
      queryOptions,
    );

    this.lokiLogger.log(`removeUnfinishedRegistrationUserRoles, found ${userRoles.length} roles for deletion.`);

    let successfullyDeleted: number = 0;
    let deletedWithError: number = 0;

    for (const userRole of userRoles) {
      try {
        if (userRole.user.administratedCompany && isInRoles(CORPORATE_SUPER_ADMIN_ROLES, userRole.role.name)) {
          await this.removalService.removeCompany(userRole.user.administratedCompany);
        } else {
          if (userRole.user.userRoles.length > 1) {
            await this.removalService.removeUserRole(userRole.id);
          } else {
            await this.removalService.removeUser(userRole.userId);
          }
        }

        successfullyDeleted++;
      } catch (error) {
        this.lokiLogger.error(
          `Failed to delete userRole ${userRole.id} (userId: ${userRole.user.id})`,
          (error as Error).stack,
        );
        deletedWithError++;

        continue;
      }
    }

    if (userRoles.length > 0) {
      this.lokiLogger.log(
        `removeUnfinishedRegistrationUserRoles success: ${successfullyDeleted}, errors: ${deletedWithError}`,
      );
    }
  }

  private async removeCompanies(): Promise<void> {
    const queryOptions = this.removalQueryOptionsService.removeCompaniesOptions();
    const companies = await findManyTyped<TRemoveCompanies[]>(this.companyRepository, queryOptions);

    this.lokiLogger.log(`removeCompanies, count of companies for deleting: ${companies.length}`);

    for (const company of companies) {
      await this.removalService.removeCompany(company);
    }
  }
}

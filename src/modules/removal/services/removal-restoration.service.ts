import { BadRequestException, Injectable } from "@nestjs/common";
import { IsNull, Repository } from "typeorm";
import { UserRole } from "src/modules/users/entities";
import { User } from "src/modules/users/entities";
import { InjectRepository } from "@nestjs/typeorm";
import { Company } from "src/modules/companies/entities";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { findOneOrFailTyped, findOneTyped } from "src/common/utils";
import {
  TRestoreByRestorationKeyUser,
  TRestoreByRestorationKeyUserRole,
  TRestoreCompanyEntity,
} from "src/modules/removal/common/types";
import { RemovalQueryOptionsService } from "src/modules/removal/services";

@Injectable()
export class RemovalRestorationService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly removalQueryOptionsService: RemovalQueryOptionsService,
  ) {}

  public async restoreByRestorationKey(restorationKey: string): Promise<void> {
    const queryOptions = this.removalQueryOptionsService.restoreByRestorationKeyOptions(restorationKey);

    const user = await findOneTyped<TRestoreByRestorationKeyUser>(this.userRepository, queryOptions.user);

    if (user) {
      await this.restoreUserEntity(user);

      return;
    }

    const userRole = await findOneTyped<TRestoreByRestorationKeyUserRole>(
      this.userRoleRepository,
      queryOptions.userRole,
    );

    if (userRole) {
      await this.restoreUserRoleEntity(userRole);

      return;
    }

    throw new BadRequestException("Incorrect restoration key.");
  }

  private async restoreUserEntity(user: TRestoreByRestorationKeyUser): Promise<void> {
    await this.userRepository.update(
      { id: user.id },
      { isInDeleteWaiting: false, deletingDate: null, restorationKey: null },
    );
    await this.userRoleRepository.update(
      { user: { id: user.id }, isInDeleteWaiting: true, deletingDate: IsNull() },
      { isInDeleteWaiting: false },
    );
  }

  private async restoreUserRoleEntity(userRole: TRestoreByRestorationKeyUserRole): Promise<void> {
    await this.userRoleRepository.update(
      { id: userRole.id },
      { isInDeleteWaiting: false, deletingDate: null, restorationKey: null },
    );
  }

  public async restoreCompanyEntity(user: ITokenUserData): Promise<void> {
    const queryOptions = this.removalQueryOptionsService.restoreCompanyEntityOptions(user.id);
    const company = await findOneOrFailTyped<TRestoreCompanyEntity>(user.id, this.companyRepository, queryOptions);

    if (!company.isInDeleteWaiting) {
      throw new Error("Company is not requested for removal.");
    }

    await this.companyRepository.update(
      { id: company.id },
      { isInDeleteWaiting: false, deletingDate: null, removeAllAdminRoles: null },
    );
  }
}

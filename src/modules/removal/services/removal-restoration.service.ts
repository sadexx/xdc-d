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
import { ERemovalErrorCodes } from "src/modules/removal/common/enums";

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

    throw new BadRequestException(ERemovalErrorCodes.INCORRECT_RESTORATION_KEY);
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

    if (user.administratedCompany) {
      await this.restoreCompanyEntity(user.administratedCompany.id);
    }
  }

  private async restoreUserRoleEntity(userRole: TRestoreByRestorationKeyUserRole): Promise<void> {
    await this.userRoleRepository.update(
      { id: userRole.id },
      { isInDeleteWaiting: false, deletingDate: null, restorationKey: null },
    );

    if (userRole.user.administratedCompany) {
      await this.restoreCompanyEntity(userRole.user.administratedCompany.id);
    }
  }

  public async restoreCompany(user: ITokenUserData): Promise<void> {
    const queryOptions = this.removalQueryOptionsService.restoreCompanyEntityOptions(user.id);
    const company = await findOneOrFailTyped<TRestoreCompanyEntity>(user.id, this.companyRepository, queryOptions);

    if (!company.isInDeleteWaiting) {
      throw new BadRequestException(ERemovalErrorCodes.COMPANY_NOT_IN_DELETE_WAITING);
    }

    await this.restoreCompanyEntity(company.id);
  }

  private async restoreCompanyEntity(companyId: string): Promise<void> {
    await this.companyRepository.update(
      { id: companyId },
      { isInDeleteWaiting: false, deletingDate: null, removeAllAdminRoles: null },
    );
    await this.companyRepository.update(
      { operatedByMainCompanyId: companyId },
      { isInDeleteWaiting: false, deletingDate: null, removeAllAdminRoles: null },
    );
  }
}

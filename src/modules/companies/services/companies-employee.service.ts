import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EmailsService } from "src/modules/emails/services";
import { CreateEmployeeDto, SendEmployeeInvitationLinkDto } from "src/modules/companies/common/dto";
import { UserRole } from "src/modules/users/entities";
import { ECompaniesErrorCodes, ECompanyStatus, ECompanyType } from "src/modules/companies/common/enums";
import { EAccountStatus } from "src/modules/users/common/enums";
import { SendEmployeeInvitationLinkOutput } from "src/modules/companies/common/outputs";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { UsersRegistrationService } from "src/modules/users/services";
import {
  ALLOWED_CORPORATE_CLIENTS_EMPLOYEE_ROLES,
  ALLOWED_CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS_EMPLOYEE_ROLES,
  ALLOWED_CORPORATE_INTERPRETING_PROVIDERS_EMPLOYEE_ROLES,
} from "src/common/constants";
import { COMPANY_LFH_FULL_NAME, COMPANY_LFH_ID } from "src/modules/companies/common/constants/constants";
import { Company } from "src/modules/companies/entities";
import { findOneOrFail, findOneOrFailTyped, isInRoles } from "src/common/utils";
import { AccessControlService } from "src/modules/access-control/services";
import { CreateAddressDto } from "src/modules/addresses/common/dto";
import { AuthRegistrationLinkService } from "src/modules/auth/services";

@Injectable()
export class CompaniesEmployeeService {
  constructor(
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly emailsService: EmailsService,
    private readonly authRegistrationLinkService: AuthRegistrationLinkService,
    private readonly usersRegistrationService: UsersRegistrationService,
    private readonly accessControlService: AccessControlService,
  ) {}

  public async createEmployee(
    dto: CreateEmployeeDto,
    currentUser: ITokenUserData,
  ): Promise<SendEmployeeInvitationLinkOutput> {
    const company = await this.accessControlService.getCompanyByRole(currentUser, { address: true }, dto.id);

    if (!company) {
      throw new NotFoundException(ECompaniesErrorCodes.COMPANIES_COMMON_COMPANY_NOT_FOUND);
    }

    if (company.status !== ECompanyStatus.ACTIVE) {
      throw new BadRequestException(ECompaniesErrorCodes.EMPLOYEE_COMPANY_NOT_ACTIVATED);
    }

    if (
      (company.companyType === ECompanyType.CORPORATE_CLIENTS &&
        !isInRoles(ALLOWED_CORPORATE_CLIENTS_EMPLOYEE_ROLES, dto.role)) ||
      (company.companyType === ECompanyType.CORPORATE_INTERPRETING_PROVIDERS &&
        !isInRoles(ALLOWED_CORPORATE_INTERPRETING_PROVIDERS_EMPLOYEE_ROLES, dto.role)) ||
      (company.companyType === ECompanyType.CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS &&
        !isInRoles(ALLOWED_CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS_EMPLOYEE_ROLES, dto.role))
    ) {
      throw new BadRequestException(ECompaniesErrorCodes.EMPLOYEE_ROLE_NOT_ALLOWED);
    }

    let operatedByMainCorporateCompanyName = COMPANY_LFH_FULL_NAME;
    let operatedByMainCorporateCompanyId = COMPANY_LFH_ID;

    if (company.companyType === ECompanyType.CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS) {
      const mainCompany = await findOneOrFail(company.operatedByMainCompanyId, this.companyRepository, {
        where: { id: company.operatedByMainCompanyId },
      });

      operatedByMainCorporateCompanyName = mainCompany.name;
      operatedByMainCorporateCompanyId = mainCompany.id;
    }

    const { userRole, isUserExists } = await this.usersRegistrationService.registerUserForInvitationWithProfile(
      dto,
      dto.profileInformation,
      company.address as CreateAddressDto,
    );

    await this.userRoleRepository.update(userRole.id, {
      operatedByCompanyId: company.id,
      operatedByCompanyName: company.name,
      operatedByMainCorporateCompanyName,
      operatedByMainCorporateCompanyId,
      timezone: company.address.timezone,
    });

    return await this.sendEmployeeInvitationLink(userRole.id, isUserExists);
  }

  public async resendEmployeeInvitationLink(
    dto: SendEmployeeInvitationLinkDto,
    currentUser: ITokenUserData,
  ): Promise<SendEmployeeInvitationLinkOutput> {
    const userRole = await findOneOrFailTyped<UserRole>(dto.userRoleId, this.userRoleRepository, {
      where: { id: dto.userRoleId },
      relations: { user: true },
    });

    await this.authRegistrationLinkService.validateInvitationLinkTimeLimit(userRole);
    await this.accessControlService.authorizeUserRoleForOperation(currentUser, userRole);

    return await this.sendEmployeeInvitationLink(dto.userRoleId, userRole.user.isRegistrationFinished);
  }

  private async sendEmployeeInvitationLink(
    userRoleId: string,
    isUserExists: boolean,
  ): Promise<SendEmployeeInvitationLinkOutput> {
    const userRole = await findOneOrFailTyped<UserRole>(userRoleId, this.userRoleRepository, {
      where: { id: userRoleId },
      relations: { user: true, role: true, profile: true },
    });

    const { registrationLink, linkDurationString } = await this.authRegistrationLinkService.generateRegistrationLink(
      userRole.user.id,
      userRole.user.email,
      userRole.role.name,
      isUserExists,
    );

    await this.emailsService.sendCompanyEmployeeInvitationLink(
      userRole.user.email,
      registrationLink,
      linkDurationString,
      `${userRole.profile.preferredName || userRole.profile.firstName} ${userRole.profile.lastName}`,
      userRole.role.name,
      userRole.operatedByCompanyName,
    );

    const linkCreationTime = new Date();

    await this.userRoleRepository.update(
      { id: userRoleId },
      { accountStatus: EAccountStatus.INVITATION_LINK, invitationLinkCreationDate: linkCreationTime },
    );

    return {
      id: userRoleId,
      linkCreationTime,
    };
  }
}

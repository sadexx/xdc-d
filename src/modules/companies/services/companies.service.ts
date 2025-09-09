import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Company } from "src/modules/companies/entities";
import { EUserRoleName } from "src/modules/users/common/enums";
import { EmailsService } from "src/modules/emails/services";
import {
  ECompanyActivitySphere,
  ECompanyEmployeesNumber,
  ECompanyStatus,
  ECompanyType,
} from "src/modules/companies/common/enums";
import {
  CreateCompanyDto,
  CreateCompanyRegistrationRequestDto,
  UpdateCompanyProfileDto,
  UpdateCompanyRegistrationRequestDto,
  UpdateCompanySubStatusDto,
} from "src/modules/companies/common/dto";
import { User } from "src/modules/users/entities";
import { REGISTRATION_TOKEN_QUERY_PARAM, ROLE_QUERY_PARAM } from "src/modules/auth/common/constants/constants";
import { ICreateCompanyAdminData } from "src/modules/users/common/interfaces";
import { Address } from "src/modules/addresses/entities";
import { UserRole } from "src/modules/users/entities";
import {
  COMPANY_LFH_FULL_NAME,
  COMPANY_LFH_ID,
  RESTRICTED_COMPANY_NAMES,
} from "src/modules/companies/common/constants/constants";
import { EExtCountry } from "src/modules/addresses/common/enums";
import { LFH_ADMIN_ROLES, NUMBER_OF_MILLISECONDS_IN_MINUTE, NUMBER_OF_SECONDS_IN_DAY } from "src/common/constants";
import { CompanyIdOutput, SendInvitationLinkOutput } from "src/modules/companies/common/outputs";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { HelperService } from "src/modules/helper/services";
import { CompaniesQueryService } from "src/modules/companies/services";
import { LokiLogger } from "src/common/logger";
import { CompaniesDepositChargeService } from "src/modules/companies-deposit-charge/services";
import { INewCompanyRequestDetails } from "src/modules/companies/common/interfaces";
import { Role } from "src/modules/users/entities";
import { findOneOrFail, isInRoles } from "src/common/utils";
import { AccessControlService } from "src/modules/access-control/services";
import { TokensService } from "src/modules/tokens/services";

@Injectable()
export class CompaniesService {
  private readonly lokiLogger = new LokiLogger(CompaniesService.name);

  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly companiesDepositChargeService: CompaniesDepositChargeService,
    private readonly companiesQueryService: CompaniesQueryService,
    private readonly configService: ConfigService,
    private readonly emailsService: EmailsService,
    private readonly tokensService: TokensService,
    private readonly helperService: HelperService,
    private readonly accessControlService: AccessControlService,
  ) {}

  public async createCompanyRegistrationRequest(dto: CreateCompanyRegistrationRequestDto): Promise<CompanyIdOutput> {
    if (dto.companyType === ECompanyType.CORPORATE_CLIENTS && !dto.activitySphere) {
      throw new BadRequestException("activitySphere is required for corporate clients");
    }

    if (RESTRICTED_COMPANY_NAMES.includes(dto.name.toUpperCase())) {
      throw new BadRequestException("Reserved company name!");
    }

    const existedCompany = await this.companiesQueryService.getCompanyByPhoneNumber(dto.phoneNumber);

    if (existedCompany) {
      throw new BadRequestException("Company with such phone number already exists");
    }

    const lfhCompany = await findOneOrFail(COMPANY_LFH_ID, this.companyRepository, {
      select: { id: true, name: true, platformId: true },
      where: { id: COMPANY_LFH_ID },
    });

    const company = this.companyRepository.create({
      name: dto.name,
      contactPerson: dto.contactPerson,
      phoneNumber: dto.phoneNumber,
      contactEmail: dto.contactEmail,
      country: dto.country,
      activitySphere: dto.activitySphere,
      employeesNumber: dto.employeesNumber,
      companyType: dto.companyType,
      operatedByMainCompanyId: lfhCompany.id,
      operatedByMainCompanyName: lfhCompany.name,
      operatedByMainCompanyPlatformId: lfhCompany.platformId,
    });

    const newCompany: Company = await this.companyRepository.save(company);

    await this.notifyCompanyAndSuperAdminAboutNewRequest(newCompany);

    return { id: newCompany.id };
  }

  public async updateCompanyRegistrationRequest(dto: UpdateCompanyRegistrationRequestDto): Promise<CompanyIdOutput> {
    if (dto.name && RESTRICTED_COMPANY_NAMES.includes(dto.name.toUpperCase())) {
      throw new BadRequestException("Reserved company name!");
    }

    let adminUserRole: EUserRoleName = EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_SUPER_ADMIN;

    const companyRequest = await this.companyRepository.findOne({ where: { id: dto.id } });

    if (companyRequest?.superAdminId) {
      delete dto.country;
    }

    if (!companyRequest) {
      throw new NotFoundException("Company with this id not found!");
    }

    if (dto.companyType === ECompanyType.CORPORATE_CLIENTS) {
      adminUserRole = EUserRoleName.CORPORATE_CLIENTS_SUPER_ADMIN;
    }

    const dataForUpdate: Partial<Company> = { ...dto };
    delete dataForUpdate.depositAmount;

    if (dto.adminEmail && dto.adminName) {
      const companyDuplicate = await this.companyRepository.findOne({ where: { adminEmail: dto.adminEmail } });

      if (companyDuplicate) {
        throw new BadRequestException("Company with this admin email already exist!");
      }

      let user = await this.userRepository.findOne({
        where: { email: dto.adminEmail },
        relations: { administratedCompany: true, userRoles: { role: true } },
      });

      if (!user) {
        const superAdmin = await this.createCompanyAdmin({
          email: dto.adminEmail,
          role: adminUserRole,
          phoneNumber: dto.phoneNumber,
        });

        dataForUpdate.superAdmin = superAdmin;
      } else {
        const existedAdminUserRole = await this.userRoleRepository.findOne({
          where: { userId: user.id, role: { name: adminUserRole } },
        });

        if (!existedAdminUserRole) {
          const foundRole = await findOneOrFail(
            adminUserRole,
            this.roleRepository,
            { where: { name: adminUserRole } },
            "name",
          );

          const userRole = this.userRoleRepository.create({ role: foundRole, user });

          await this.userRoleRepository.save(userRole);

          user = await findOneOrFail(
            dto.adminEmail,
            this.userRepository,
            {
              where: { email: dto.adminEmail },
              relations: { administratedCompany: true, userRoles: { role: true } },
            },
            "email",
          );
        }

        dataForUpdate.superAdmin = user;
      }
    }

    const updatedCompany = await this.companyRepository.save(dataForUpdate);

    if (dto.adminEmail && dto.adminName && updatedCompany.superAdmin) {
      const superAdminRole = await this.helperService.getUserRoleByName<UserRole>(
        updatedCompany.superAdmin,
        adminUserRole,
      );

      await this.userRoleRepository.update(
        { id: superAdminRole.id },
        {
          operatedByCompanyName: companyRequest.name,
          operatedByCompanyId: companyRequest.id,
          operatedByMainCorporateCompanyId: COMPANY_LFH_ID,
          operatedByMainCorporateCompanyName: COMPANY_LFH_FULL_NAME,
        },
      );
    }

    return { id: companyRequest.id };
  }

  public async createCompany(dto: CreateCompanyDto, user: ITokenUserData): Promise<CompanyIdOutput> {
    if (RESTRICTED_COMPANY_NAMES.includes(dto.name.toUpperCase())) {
      throw new BadRequestException("Reserved company name!");
    }

    if (
      user.role === EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_SUPER_ADMIN &&
      dto.companyType !== ECompanyType.CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS
    ) {
      throw new BadRequestException("Incorrect company type!");
    }

    const existedCompany = await this.companyRepository.findOne({
      where: [{ adminEmail: dto.adminEmail }, { phoneNumber: dto.phoneNumber }],
    });

    if (existedCompany) {
      throw new BadRequestException("Company with such phone number or email already exists");
    }

    const lfhCompany = await findOneOrFail(COMPANY_LFH_ID, this.companyRepository, {
      select: { id: true, name: true, platformId: true },
      where: { id: COMPANY_LFH_ID },
    });

    let adminUserRole: EUserRoleName = EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_SUPER_ADMIN;
    let companyOperatedBy = lfhCompany.id;
    let companyNameOperatedBy = lfhCompany.name;
    let companyOperatedByPlatformId = lfhCompany.platformId;

    if (dto.companyType === ECompanyType.CORPORATE_CLIENTS) {
      adminUserRole = EUserRoleName.CORPORATE_CLIENTS_SUPER_ADMIN;
    }

    let operatedByMainCorporateCompanyName = COMPANY_LFH_FULL_NAME;
    let operatedByMainCorporateCompanyId = COMPANY_LFH_ID;

    if (dto.companyType === ECompanyType.CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS) {
      adminUserRole = EUserRoleName.CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS_SUPER_ADMIN;

      if (!dto.operatedByMainCompanyId) {
        throw new BadRequestException("operatedByMainCompanyId must been not empty for this role!");
      }

      const operatedByCompany = await this.companyRepository.findOne({ where: { id: dto.operatedByMainCompanyId } });

      if (!operatedByCompany) {
        throw new BadRequestException("Operated company not found!");
      }

      companyOperatedBy = operatedByCompany.id;
      companyNameOperatedBy = operatedByCompany.name;
      companyOperatedByPlatformId = operatedByCompany.platformId;
      operatedByMainCorporateCompanyName = operatedByCompany.name;
      operatedByMainCorporateCompanyId = operatedByCompany.id;

      delete dto.depositDefaultChargeAmount;
    }

    if (user.role !== EUserRoleName.SUPER_ADMIN) {
      delete dto.depositDefaultChargeAmount;
    }

    const existedSuperAdmin = await this.userRepository.findOne({
      where: { email: dto.adminEmail },
      relations: { administratedCompany: true },
    });

    if (existedSuperAdmin && existedSuperAdmin.administratedCompany) {
      throw new BadRequestException("Corporate client with this email already exist!");
    }

    const superAdmin = await this.createCompanyAdmin({
      email: dto.adminEmail,
      role: adminUserRole,
      phoneNumber: dto.phoneNumber,
    });

    const companyData: CreateCompanyDto = { ...dto };
    delete companyData.depositDefaultChargeAmount;

    const company = this.companyRepository.create({
      ...companyData,
      superAdmin,
      operatedByMainCompanyId: companyOperatedBy,
      operatedByMainCompanyName: companyNameOperatedBy,
      operatedByMainCompanyPlatformId: companyOperatedByPlatformId,
    });

    const newCompany: Company = await this.companyRepository.save(company);

    if (newCompany.superAdmin) {
      const superAdminRole = await this.helperService.getUserRoleByName<UserRole>(newCompany.superAdmin, adminUserRole);
      await this.userRoleRepository.update(
        { id: superAdminRole.id },
        {
          operatedByCompanyName: newCompany.name,
          operatedByCompanyId: newCompany.id,
          operatedByMainCorporateCompanyName,
          operatedByMainCorporateCompanyId,
        },
      );
    }

    if (dto.depositDefaultChargeAmount) {
      await this.companiesDepositChargeService.createOrUpdateDepositCharge(newCompany, dto.depositDefaultChargeAmount);
    }

    return { id: newCompany.id };
  }

  private async createCompanyAdmin(createCompanyAdminData: ICreateCompanyAdminData): Promise<User> {
    const role = createCompanyAdminData.role;

    const roleName = await this.roleRepository.findOneOrFail({
      select: { id: true, name: true },
      where: { name: role },
    });

    const userRole = this.userRoleRepository.create({ role: roleName });

    return this.userRepository.create({
      ...createCompanyAdminData,
      isDefaultAvatar: true,
      isEmailVerified: true,
      userRoles: [userRole],
    });
  }

  public async removeRequest(id: string, user: ITokenUserData): Promise<void> {
    const companyRequest = await this.accessControlService.getCompanyByRole(
      user,
      {
        superAdmin: {
          userRoles: true,
        },
      },
      id,
    );

    if (!companyRequest) {
      throw new NotFoundException("Company with id not found!");
    }

    if (
      companyRequest.status !== ECompanyStatus.NEW_REQUEST &&
      companyRequest.status !== ECompanyStatus.INVITATION_LINK_SENT
    ) {
      throw new BadRequestException("This request already accepted!");
    }

    await this.companyRepository.delete({ id });

    if (companyRequest.superAdminId) {
      await this.userRepository.delete({ id: companyRequest.superAdminId });
    }

    return;
  }

  public async updateCompanySubStatus({ id, subStatus }: UpdateCompanySubStatusDto): Promise<CompanyIdOutput> {
    const companyRequest = await this.companyRepository.findOne({ where: { id } });

    if (!companyRequest) {
      throw new NotFoundException("Company with id not found!");
    }

    await this.companyRepository.update({ id }, { subStatus });

    return { id: companyRequest.id };
  }

  public async sendSuperAdminInvitationLink(id: string, user: ITokenUserData): Promise<SendInvitationLinkOutput> {
    const companyRequest = await this.companiesQueryService.getCompany(id, user, {
      superAdmin: { userRoles: { role: true } },
      address: true,
    });

    if (!companyRequest) {
      throw new NotFoundException("Company with this id not found!");
    }

    if (!companyRequest.superAdmin) {
      throw new BadRequestException(`Company with id ${companyRequest.id} does not have superAdmin!`);
    }

    await this.accessControlService.authorizeUserRoleForCompanyOperation(user, companyRequest);

    if (!companyRequest.adminName || !companyRequest.adminEmail) {
      throw new ForbiddenException("Please, set admin name and email before sending link!");
    }

    if (
      companyRequest.status !== ECompanyStatus.NEW_REQUEST &&
      companyRequest.status !== ECompanyStatus.INVITATION_LINK_SENT
    ) {
      throw new BadRequestException("This company already registered!");
    }

    if (companyRequest.invitationLinkCreationDate) {
      const MIN_TIME_LIMIT_MINUTES = 5;
      const minTimeLimit = MIN_TIME_LIMIT_MINUTES * NUMBER_OF_MILLISECONDS_IN_MINUTE;

      const now = new Date();
      const sendingDifferent = now.getTime() - companyRequest.invitationLinkCreationDate.getTime();

      if (sendingDifferent < minTimeLimit) {
        throw new BadRequestException(`Invitation link was sent less than ${MIN_TIME_LIMIT_MINUTES} minutes ago!`);
      }
    }

    let role: EUserRoleName | null = null;

    if (companyRequest.companyType === ECompanyType.CORPORATE_INTERPRETING_PROVIDERS) {
      role = EUserRoleName.CORPORATE_INTERPRETING_PROVIDERS_SUPER_ADMIN;
    }

    if (companyRequest.companyType === ECompanyType.CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS) {
      role = EUserRoleName.CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS_SUPER_ADMIN;
    }

    if (companyRequest.companyType === ECompanyType.CORPORATE_CLIENTS) {
      role = EUserRoleName.CORPORATE_CLIENTS_SUPER_ADMIN;
    }

    if (!role) {
      throw new BadRequestException("Incorrect company type!");
    }

    const invitationToken = await this.tokensService.createRegistrationToken({
      email: companyRequest.superAdmin.email,
      userId: companyRequest.superAdmin.id,
      userRole: role,
      isInvitation: true,
    });

    const baseUrl = companyRequest.superAdmin.isRegistrationFinished
      ? this.configService.getOrThrow<string>("frontend.registrationStepAgreementsLink")
      : this.configService.getOrThrow<string>("frontend.registrationStepPasswordLink");
    const completeRegistrationLink = `${baseUrl}?${REGISTRATION_TOKEN_QUERY_PARAM}=${invitationToken}&${ROLE_QUERY_PARAM}=${role}`;

    const linkDurationSeconds = this.configService.getOrThrow<number>("jwt.invitation.expirationTimeSeconds");
    const linkDurationString = linkDurationSeconds / NUMBER_OF_SECONDS_IN_DAY + " days";
    await this.emailsService.sendCompanySuperAdminInvitationLink(
      companyRequest.adminEmail,
      completeRegistrationLink,
      linkDurationString,
      companyRequest.adminName,
    );

    const linkCreationTime = new Date();

    await this.companyRepository.update(
      { id },
      { status: ECompanyStatus.INVITATION_LINK_SENT, invitationLinkCreationDate: linkCreationTime },
    );

    return {
      linkCreationTime,
    };
  }

  public async updateCompanyProfile(dto: UpdateCompanyProfileDto, user: ITokenUserData): Promise<void> {
    const company = await this.accessControlService.getCompanyByRole(
      user,
      { address: true },
      dto?.profileInformation?.id,
    );

    if (!company) {
      throw new NotFoundException("Company not found!");
    }

    if (
      dto.profileInformation.name &&
      RESTRICTED_COMPANY_NAMES.includes(dto.profileInformation.name.toUpperCase()) &&
      user.role !== EUserRoleName.SUPER_ADMIN &&
      company.id !== COMPANY_LFH_ID
    ) {
      throw new BadRequestException("Reserved company name!");
    }

    if (
      company.companyType !== ECompanyType.CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS &&
      dto?.profileInformation?.abnNumber
    ) {
      delete dto.profileInformation.abnNumber;
    }

    if (
      user.role !== EUserRoleName.SUPER_ADMIN ||
      company.companyType === ECompanyType.CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS
    ) {
      delete dto.profileInformation.depositDefaultChargeAmount;
    }

    if (dto.profileInformation?.platformCommissionRate) {
      const isLfhAdmin = isInRoles(LFH_ADMIN_ROLES, user.role);
      const isCorporateInterpretingProvider = company.companyType === ECompanyType.CORPORATE_INTERPRETING_PROVIDERS;

      if (!isLfhAdmin && !isCorporateInterpretingProvider) {
        throw new BadRequestException(
          "Platform commission rate can be set only for corporate interpreting providers company type.",
        );
      }
    }

    if (dto.profileInformation) {
      Object.assign(company, {
        name: dto.profileInformation.name,
        contactPerson: dto.profileInformation.contactPerson,
        phoneNumber: dto.profileInformation.phoneNumber,
        contactEmail: dto.profileInformation.contactEmail,
        activitySphere: dto.profileInformation.activitySphere,
        employeesNumber: dto.profileInformation.employeesNumber,
        businessRegistrationNumber: dto.profileInformation.businessRegistrationNumber,
        abnNumber: dto.profileInformation.abnNumber,
        platformCommissionRate: dto.profileInformation.platformCommissionRate,
      });
    }

    if (dto.residentialAddress) {
      if (
        (dto.residentialAddress.country || dto.residentialAddress.state || dto.residentialAddress.suburb) &&
        !dto.residentialAddress.timezone
      ) {
        throw new BadRequestException("Timezone must be provided when country or state or suburb is specified.");
      }

      let address: Address;

      if (company.address) {
        address = company.address;
        Object.assign(address, dto.residentialAddress);
      } else {
        address = this.addressRepository.create({ ...dto.residentialAddress });
        company.address = address;
      }

      await this.addressRepository.save(address);
    }

    await this.companyRepository.save(company);

    if (user.role === EUserRoleName.SUPER_ADMIN && dto.profileInformation.depositDefaultChargeAmount) {
      await this.companiesDepositChargeService.createOrUpdateDepositCharge(
        company,
        dto.profileInformation.depositDefaultChargeAmount,
      );
    }

    return;
  }

  public async seedLfhCompanyToDatabase(): Promise<void> {
    const lfhCompany = await this.companyRepository.findOne({
      where: { id: COMPANY_LFH_ID },
    });

    if (!lfhCompany) {
      const createdAddress = this.addressRepository.create({
        latitude: -33.90098,
        longitude: 151.210495,
        country: "Australia",
        state: "New South Wales",
        suburb: "Waterloo",
        streetName: "Thread Lane",
        streetNumber: "36/1",
        postcode: "2017",
        timezone: "Australia/Sydney",
      });

      const address = await this.addressRepository.save(createdAddress);

      const createdLfhCompany = this.companyRepository.create({
        id: COMPANY_LFH_ID,
        name: COMPANY_LFH_FULL_NAME,
        phoneNumber: "+61459490550",
        contactPerson: "Rozalia Alpert",
        contactEmail: "super.admin@linguafrancahub.com",
        country: EExtCountry.AUSTRALIA,
        activitySphere: ECompanyActivitySphere.LANGUAGE_SERVICE_COMPANY,
        employeesNumber: ECompanyEmployeesNumber.MORE_THEN_EIGHT_HUNDRED,
        status: ECompanyStatus.ACTIVE,
        companyType: ECompanyType.CORPORATE_INTERPRETING_PROVIDERS,
        adminName: "Rozalia Alpert",
        adminEmail: "super.admin@linguafrancahub.com",
        operatedByMainCompanyId: COMPANY_LFH_ID,
        operatedByMainCompanyName: COMPANY_LFH_FULL_NAME,
        abnNumber: "42 661 208 635",
        address,
        isActive: true,
      });

      await this.companyRepository.save(createdLfhCompany);

      this.lokiLogger.log("Seeded LFH company");
    }
  }

  private async notifyCompanyAndSuperAdminAboutNewRequest(newCompany: Company): Promise<void> {
    const newCompanyRequestDetails: INewCompanyRequestDetails = {
      companyName: newCompany.name,
      phoneNumber: newCompany.phoneNumber,
      country: newCompany.country,
      contactPersonName: newCompany.contactPerson,
      contactEmail: newCompany.contactEmail,
      industry: newCompany.activitySphere,
      numberOfEmployees: newCompany.employeesNumber,
    };

    this.emailsService
      .sendNewCompanyRequestEmail(newCompanyRequestDetails.contactEmail, newCompanyRequestDetails)
      .catch((error: Error) => {
        this.lokiLogger.error(
          `Error in sendNewCompanyRequestEmail for email: ${newCompanyRequestDetails.contactEmail}`,
          error.stack,
        );
      });

    const superAdmins = await this.helperService.getSuperAdmin();

    for (const superAdmin of superAdmins) {
      this.emailsService
        .sendNewCompanyRequestNotifyToAdminEmail(superAdmin.email, newCompanyRequestDetails)
        .catch((error: Error) => {
          this.lokiLogger.error(
            `Error in sendNewCompanyRequestNotifyToAdminEmail for email: ${superAdmin.email}`,
            error.stack,
          );
        });
    }
  }
}

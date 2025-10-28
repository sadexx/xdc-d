import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { FindOptionsRelations, Repository } from "typeorm";
import { Company, CompanyDocument } from "src/modules/companies/entities";
import { InjectRepository } from "@nestjs/typeorm";
import { COMPANY_LFH_ID } from "src/modules/companies/common/constants/constants";
import { UserRole } from "src/modules/users/entities";
import { EUserRoleName } from "src/modules/users/common/enums";
import { GetCompaniesDto, GetEmployeesDto } from "src/modules/companies/common/dto";
import { GetCompaniesOutput, GetDocumentOutput, GetEmployeesOutput } from "src/modules/companies/common/outputs";
import { CompaniesQueryOptionsService } from "src/modules/companies/services";
import { AwsS3Service } from "src/modules/aws/s3/aws-s3.service";
import { AccessControlService } from "src/modules/access-control/services";
import { findOneOrFailTyped } from "src/common/utils";
import { ECompaniesErrorCodes } from "src/modules/companies/common/enums";
import { LokiLogger } from "src/common/logger";

@Injectable()
export class CompaniesQueryService {
  private readonly lokiLogger = new LokiLogger(CompaniesQueryService.name);
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(CompanyDocument)
    private readonly companyDocumentRepository: Repository<CompanyDocument>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly companiesQueryOptionsService: CompaniesQueryOptionsService,
    private readonly awsS3Service: AwsS3Service,
    private readonly accessControlService: AccessControlService,
  ) {}

  /**
   ** CompanyService
   */

  public async getCompany(
    id: string,
    user: ITokenUserData,
    relations: FindOptionsRelations<Company> = {
      address: true,
      contract: true,
      contractSigners: true,
      documents: true,
      abnCheck: true,
      superAdmin: {
        avatar: true,
        userRoles: { role: true },
      },
      paymentInformation: true,
    },
  ): Promise<Company | null> {
    const company = await this.companyRepository.findOne({
      select: {
        paymentInformation: {
          interpreterSystemForPayout: true,
          note: true,
          paypalEmail: true,
          stripeClientLastFour: true,
          stripeInterpreterBankAccountLast4: true,
          stripeInterpreterCardLast4: true,
          stripeInterpreterOnboardingStatus: true,
        },
        superAdmin: {
          id: true,
          platformId: true,
          email: true,
          isDefaultAvatar: true,
          isRegistrationFinished: true,
          avatarUrl: true,
          userRoles: {
            id: true,
            role: {
              name: true,
            },
          },
        },
      },
      where: { id },
      relations: relations,
    });

    if (company) {
      await this.accessControlService.authorizeUserRoleForCompanyOperation(user, company);
    }

    return company;
  }

  public async getCompanyByUser(user: ITokenUserData): Promise<Company | null> {
    const isLfhAdminOperation = this.accessControlService.checkLfhAdminRoleForOperation(user);

    let companyId: string;

    if (isLfhAdminOperation) {
      companyId = COMPANY_LFH_ID;
    } else {
      const userRole = await findOneOrFailTyped<UserRole>(user.userRoleId, this.userRoleRepository, {
        select: { id: true, operatedByCompanyId: true },
        where: { id: user.userRoleId },
      });

      companyId = userRole.operatedByCompanyId;
    }

    const company = await this.companyRepository.findOne({
      where: { id: companyId },
      relations: {
        address: true,
        contract: true,
        contractSigners: true,
        documents: true,
        abnCheck: true,
        superAdmin: {
          avatar: true,
        },
      },
    });

    return company;
  }

  public async getCompanyByPhoneNumber(phoneNumber: string): Promise<Company | null> {
    return await this.companyRepository.findOneBy({ phoneNumber });
  }

  public async getCompanies(dto: GetCompaniesDto, user: ITokenUserData): Promise<GetCompaniesOutput> {
    const queryBuilder = this.companyRepository.createQueryBuilder("company");

    if (dto.operatedByMainCompanyId) {
      const companyOperatedBy = await this.accessControlService.getCompanyByRole(user, {}, dto.operatedByMainCompanyId);

      if (!companyOperatedBy) {
        throw new NotFoundException(ECompaniesErrorCodes.QUERY_MAIN_COMPANY_NOT_FOUND);
      }
    }

    this.companiesQueryOptionsService.getCompaniesOptions(queryBuilder, dto);

    const [companies, count] = await queryBuilder.getManyAndCount();

    return { data: companies, total: count, limit: dto.limit, offset: dto.offset };
  }

  public async getSuperAdminByCompanyId(id: string, user: ITokenUserData): Promise<UserRole | null> {
    const company = await findOneOrFailTyped<Company>(id, this.companyRepository, {
      where: { id },
    });

    const personalUserRole = await findOneOrFailTyped<UserRole>(user.userRoleId, this.userRoleRepository, {
      where: { id: user.userRoleId },
    });

    this.accessControlService.validateParentCompanyAccess(personalUserRole, company);

    if (!company.superAdminId) {
      this.lokiLogger.error(`Company ${id} does not have superAdmin.`);
      throw new BadRequestException(ECompaniesErrorCodes.COMPANIES_COMMON_NO_SUPER_ADMIN);
    }

    const userRole = await this.userRoleRepository.findOne({
      select: {
        id: true,
        isUserAgreedToTermsAndConditions: true,
        isRegistrationFinished: true,
        isRequiredInfoFulfilled: true,
        isActive: true,
        accountStatus: true,
        lastDeactivationDate: true,
        user: {
          id: true,
          platformId: true,
          email: true,
          isEmailVerified: true,
          phoneNumber: true,
          isRegistrationFinished: true,
          isDefaultAvatar: true,
          avatarUrl: true,
          avatar: true,
          userRoles: {
            id: true,
          },
        },
      },
      where: {
        userId: company.superAdminId,
        operatedByCompanyId: company.id,
        role: { name: EUserRoleName.CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS_SUPER_ADMIN },
      },
      relations: {
        profile: true,
        address: true,
        user: { userRoles: true, avatar: true },
        questionnaire: {
          recommendations: true,
        },
      },
    });

    return userRole;
  }

  /**
   ** CompaniesEmployeeService
   */

  public async getAllEmployees(dto: GetEmployeesDto, user: ITokenUserData): Promise<GetEmployeesOutput> {
    const company = await this.accessControlService.getCompanyByRole(user, {}, dto.companyId);

    if (!company) {
      throw new NotFoundException(ECompaniesErrorCodes.COMPANIES_COMMON_COMPANY_NOT_FOUND);
    }

    const queryBuilder = this.userRoleRepository
      .createQueryBuilder("userRole")
      .where("userRole.operatedByCompanyId = :companyId", { companyId: company.id });

    this.companiesQueryOptionsService.getAllEmployeesOptions(queryBuilder, dto);

    const [userRoles, count] = await queryBuilder.getManyAndCount();

    return { data: userRoles, total: count, limit: dto.limit, offset: dto.offset };
  }

  public async getById(id: string, user: ITokenUserData): Promise<UserRole | null> {
    const userRole = await this.userRoleRepository.findOne({
      select: {
        user: {
          id: true,
          platformId: true,
          email: true,
          isEmailVerified: true,
          phoneNumber: true,
          isRegistrationFinished: true,
          isDefaultAvatar: true,
          avatarUrl: true,
          avatar: true,
          userRoles: {
            id: true,
          },
        },
      },
      where: { id },
      relations: {
        address: true,
        profile: true,
        user: { avatar: true, userRoles: true },
        role: true,
        interpreterProfile: true,
      },
    });

    if (userRole) {
      await this.accessControlService.getCompanyByRole(user, {}, userRole.operatedByCompanyId);
    }

    return userRole;
  }

  /**
   ** CompaniesDocumentsService
   */

  public async getDocs(user: ITokenUserData, companyId?: string): Promise<CompanyDocument[]> {
    const company = await this.accessControlService.getCompanyByRole(user, { documents: true }, companyId);

    if (!company) {
      throw new NotFoundException(ECompaniesErrorCodes.COMPANIES_COMMON_COMPANY_NOT_FOUND);
    }

    return company.documents;
  }

  public async getDoc(id: string, user: ITokenUserData): Promise<GetDocumentOutput> {
    const document = await findOneOrFailTyped<CompanyDocument>(id, this.companyDocumentRepository, {
      where: { id },
      relations: { company: true },
    });

    await this.accessControlService.getCompanyByRole(user, {}, document.company.id);

    const downloadLink = await this.awsS3Service.getShortLivedSignedUrl(document.s3Key);

    return { ...document, downloadLink };
  }
}

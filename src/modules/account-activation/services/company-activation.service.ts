import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { IStepInformation } from "src/modules/account-activation/common/interfaces";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOptionsRelations, Repository } from "typeorm";
import { EAccountActivationErrorCodes, EStepStatus } from "src/modules/account-activation/common/enums";
import { AccountActivationQueryOptionsService, StepInfoService } from "src/modules/account-activation/services";
import { Company } from "src/modules/companies/entities";
import {
  FinishCompanyActivationStepsOutput,
  ICompanyActivationStepsDataOutput,
} from "src/modules/account-activation/common/outputs";
import { UserRole } from "src/modules/users/entities";
import { ECompanyStatus, ECompanyType } from "src/modules/companies/common/enums";
import { EAccountStatus } from "src/modules/users/common/enums";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { HelperService } from "src/modules/helper/services";
import { CORPORATE_SUPER_ADMIN_ROLES, UNDEFINED_VALUE } from "src/common/constants";
import { EmailsService } from "src/modules/emails/services";
import { LokiLogger } from "src/common/logger";
import { ConfigService } from "@nestjs/config";
import { AccessControlService } from "src/modules/access-control/services";
import { findOneOrFailTyped } from "src/common/utils";
import { TCompanyActivation, TSendCompanyActivationEmail } from "src/modules/account-activation/common/types";
import { localizeStepNames } from "src/modules/account-activation/common/helpers";

@Injectable()
export class CompanyActivationService {
  private readonly lokiLogger = new LokiLogger(CompanyActivationService.name);
  private readonly FRONT_END_URL: string;

  constructor(
    private readonly stepInfoService: StepInfoService,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly accountActivationQueryOptionsService: AccountActivationQueryOptionsService,
    private readonly helperService: HelperService,
    private readonly emailsService: EmailsService,
    private readonly configService: ConfigService,
    private readonly accessControlService: AccessControlService,
  ) {
    this.FRONT_END_URL = this.configService.getOrThrow<string>("frontend.uri");
  }

  public async getActivationSteps(companyId: string, user: ITokenUserData): Promise<ICompanyActivationStepsDataOutput> {
    const relations: FindOptionsRelations<Company> = {
      address: true,
      documents: true,
      abnCheck: true,
      contract: true,
      paymentInformation: true,
      superAdmin: {
        userRoles: {
          role: true,
        },
      },
    };

    const company = await this.accessControlService.getCompanyByRole(user, relations, companyId);

    if (!company) {
      throw new NotFoundException(EAccountActivationErrorCodes.COMPANY_NOT_EXIST);
    }

    let accountActivationSteps: ICompanyActivationStepsDataOutput | null = null;

    if (company.companyType === ECompanyType.CORPORATE_INTERPRETING_PROVIDER_CORPORATE_CLIENTS) {
      accountActivationSteps = this.stepInfoService.getCorporateInterpretingProviderCorporateClientsSteps(company);
    } else if (company.companyType === ECompanyType.CORPORATE_CLIENTS) {
      accountActivationSteps = this.stepInfoService.getCorporateClientSteps(company);
    } else {
      accountActivationSteps = this.stepInfoService.getCorporateInterpretingProviderSteps(company);
    }

    if (!accountActivationSteps) {
      throw new BadRequestException(EAccountActivationErrorCodes.COMPANY_STEPS_NOT_FOUND);
    }

    return accountActivationSteps;
  }

  public async activate(companyId: string, user: ITokenUserData): Promise<FinishCompanyActivationStepsOutput> {
    const queryOptions = this.accountActivationQueryOptionsService.companyActivationOptions(companyId);
    const company = await findOneOrFailTyped<TCompanyActivation>(companyId, this.companyRepository, queryOptions);

    if (!company.superAdmin) {
      throw new BadRequestException(EAccountActivationErrorCodes.COMPANY_NO_SUPER_ADMIN);
    }

    await this.accessControlService.authorizeUserRoleForCompanyOperation(user, company);

    if (company.isActive) {
      throw new BadRequestException(EAccountActivationErrorCodes.COMPANY_ALREADY_ACTIVE);
    }

    const companyActivationSteps = await this.getActivationSteps(companyId, user);

    const checkActivationCriteriaResult = this.checkActivationCriteria(companyActivationSteps);

    if (checkActivationCriteriaResult.failed.length > 0) {
      this.throwRequiredInfoException(checkActivationCriteriaResult);
    }

    let failedActivationCriteria: string | null = null;

    if (checkActivationCriteriaResult.failed.length === 0) {
      const superAdminRole = await this.helperService.getUserRoleByName<UserRole>(
        company.superAdmin,
        CORPORATE_SUPER_ADMIN_ROLES,
      );

      await this.companyRepository.update({ id: company.id }, { isActive: true, status: ECompanyStatus.ACTIVE });
      await this.userRoleRepository.update(
        { id: superAdminRole.id },
        { isActive: true, isRequiredInfoFulfilled: true, accountStatus: EAccountStatus.ACTIVE },
      );

      if (company.adminName) {
        await this.sendCompanyActivatedEmail(company.superAdmin, company.adminName);
      }
    } else {
      failedActivationCriteria = `This company in inactive. Missed activation steps: ${checkActivationCriteriaResult.failed.join(
        ", ",
      )}`;
    }

    return { failedActivationCriteria };
  }

  public async deactivate(companyId: string, user: ITokenUserData): Promise<void> {
    const queryOptions = this.accountActivationQueryOptionsService.companyActivationOptions(companyId);
    const company = await findOneOrFailTyped<TCompanyActivation>(companyId, this.companyRepository, queryOptions);

    if (!company.superAdmin) {
      throw new BadRequestException(EAccountActivationErrorCodes.COMPANY_NO_SUPER_ADMIN);
    }

    await this.accessControlService.authorizeUserRoleForCompanyOperation(user, company);

    if (!company.isActive) {
      throw new BadRequestException(EAccountActivationErrorCodes.COMPANY_NOT_ACTIVE);
    }

    const superAdminRole = await this.helperService.getUserRoleByName<UserRole>(
      company.superAdmin,
      CORPORATE_SUPER_ADMIN_ROLES,
    );

    await this.companyRepository.update(
      { id: companyId },
      { isActive: false, lastDeactivationDate: new Date(), status: ECompanyStatus.DEACTIVATED },
    );
    await this.userRoleRepository.update(
      { id: superAdminRole.id },
      { isActive: false, accountStatus: EAccountStatus.DEACTIVATED },
    );

    if (company.adminName) {
      await this.sendCompanyDeactivatedEmail(company.superAdmin, company.adminName);
    }

    return;
  }

  public throwRequiredInfoException(criteria: { passed: string[]; failed: string[] }): void {
    const passedSteps = criteria.passed.length > 0 ? localizeStepNames(criteria.passed) : UNDEFINED_VALUE;
    const failedSteps = criteria.failed.length > 0 ? localizeStepNames(criteria.failed) : UNDEFINED_VALUE;

    throw new ForbiddenException({
      message: EAccountActivationErrorCodes.REQUIRED_INFO_NOT_PROVIDED,
      variables: { passedSteps, failedSteps },
    });
  }

  public checkActivationCriteria(
    companyActivationSteps: ICompanyActivationStepsDataOutput,
    isContractNeed: boolean = true,
    strictPaymentCheck: boolean = true,
  ): {
    passed: string[];
    failed: string[];
  } {
    const passed: string[] = [];
    const failed: string[] = [];

    if (!isContractNeed) {
      delete companyActivationSteps.docusignContractFulfilled;
    }

    Object.keys(companyActivationSteps).forEach((stepName) => {
      const step = (companyActivationSteps as unknown as Record<string, IStepInformation>)[stepName];

      if (!step.isBlockAccountActivation) {
        return;
      }

      if (step === companyActivationSteps.paymentInformationFulfilled) {
        const isPaymentValid = strictPaymentCheck
          ? step.status === EStepStatus.SUCCESS
          : step.status === EStepStatus.SUCCESS || step.status === EStepStatus.INITIAL;

        if (isPaymentValid) {
          passed.push(stepName);
        } else {
          failed.push(stepName);
        }

        return;
      }

      if (step === companyActivationSteps.documentsFulfilled && step.status === EStepStatus.PENDING) {
        failed.push(stepName);

        return;
      }

      if (step.status === EStepStatus.SUCCESS) {
        passed.push(stepName);
      } else {
        failed.push(stepName);
      }
    });

    return { passed, failed };
  }

  private async sendCompanyActivatedEmail(user: TSendCompanyActivationEmail, adminName: string): Promise<void> {
    const loginLink = `${this.FRONT_END_URL}/login`;
    this.emailsService.sendCompanyActivatedEmail(user.email, adminName, loginLink).catch((error: Error) => {
      this.lokiLogger.error(`Error in sendCompanyActivatedEmail to company admin with id: ${user.id}`, error.stack);
    });
  }

  private async sendCompanyDeactivatedEmail(user: TSendCompanyActivationEmail, adminName: string): Promise<void> {
    this.emailsService.sendCompanyDeactivatedEmail(user.email, adminName).catch((error: Error) => {
      this.lokiLogger.error(`Error in sendCompanyDeactivatedEmail to company admin with id: ${user.id}`, error.stack);
    });
  }
}

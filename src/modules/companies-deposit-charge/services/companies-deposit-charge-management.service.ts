import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { DataSource, EntityManager } from "typeorm";
import { AccessControlService } from "src/modules/access-control/services";
import { CompanyIdOptionalDto } from "src/modules/companies/common/dto";
import { Company } from "src/modules/companies/entities";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { ECompaniesDepositChargeErrorCodes } from "src/modules/companies-deposit-charge/common/enums";
import { IDepositCharge } from "src/modules/companies-deposit-charge/common/interfaces";
import { TCreateChargeRequest, TCreateOrUpdateDepositCharge } from "src/modules/companies-deposit-charge/common/types";
import { CompanyDepositCharge } from "src/modules/companies-deposit-charge/entities";
import { formatDecimalString, parseDecimalNumber } from "src/common/utils";
import { ECompanyFundingSource } from "src/modules/companies/common/enums";

@Injectable()
export class CompaniesDepositChargeManagementService {
  constructor(
    private readonly accessControlService: AccessControlService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Creates a deposit charge request for the user's company.
   * Validates company activity and deposit thresholds, then creates or updates the charge in a transaction.
   *
   * @param user - Token user data for access control and company resolution.
   * @param dto - Optional company ID (resolves from user if omitted).
   * @returns Promise<void> - Resolves on successful creation/update.
   * @throws {NotFoundException} - If company not found.
   * @throws {BadRequestException} - If company inactive, no default amount, or above minimum threshold.
   */
  public async createChargeRequest(user: ITokenUserData, dto: CompanyIdOptionalDto): Promise<void> {
    const company = await this.accessControlService.getCompanyByRole(user, { abnCheck: true }, dto.companyId);
    const transformedCompany = this.validateAndTransformCompany(company);

    await this.dataSource.transaction(async (manager) => {
      const depositAmount = transformedCompany.depositAmount ?? 0;
      await this.createOrUpdateDepositCharge(
        manager,
        transformedCompany,
        transformedCompany.depositDefaultChargeAmount,
        depositAmount,
      );
    });
  }

  private validateAndTransformCompany(company: Company | null): TCreateChargeRequest {
    if (!company) {
      throw new NotFoundException(ECompaniesDepositChargeErrorCodes.COMPANY_NOT_FOUND);
    }

    if (!company.isActive) {
      throw new BadRequestException(ECompaniesDepositChargeErrorCodes.COMPANY_NOT_ACTIVE);
    }

    if (company.fundingSource === ECompanyFundingSource.POST_PAYMENT) {
      throw new BadRequestException(ECompaniesDepositChargeErrorCodes.DEPOSIT_CHARGE_NOT_AVAILABLE_FOR_POST_PAYMENT);
    }

    if (!company.depositDefaultChargeAmount) {
      throw new BadRequestException(ECompaniesDepositChargeErrorCodes.CHARGE_DEFAULT_AMOUNT_NOT_FILLED);
    }

    return this.transformCompanyToNumbers(company, company.depositDefaultChargeAmount);
  }

  /**
   * Creates or updates a deposit charge for the company based on current deposit amount.
   * Calculates charge, handles existing records, and updates defaults if needed.
   *
   * @param manager - Transaction manager for DB operations.
   * @param company - Company entity with deposit details.
   * @param depositDefaultChargeAmount - Default charge amount for calculation.
   * @param depositAmount - Current company deposit amount.
   * @returns Promise<void> - Resolves on successful creation/update.
   * @throws BadRequestException - If charge cannot be changed before execution or invalid amount (<=0).
   */
  public async createOrUpdateDepositCharge(
    manager: EntityManager,
    company: TCreateOrUpdateDepositCharge,
    depositDefaultChargeAmount: number,
    depositAmount: number,
  ): Promise<void> {
    const companyDepositChargeRepository = manager.getRepository(CompanyDepositCharge);

    const existedDepositCharge = await companyDepositChargeRepository.exists({
      where: { company: { id: company.id } },
    });

    const chargeAmount = depositDefaultChargeAmount - depositAmount;

    if (chargeAmount <= 0) {
      return;
    }

    if (existedDepositCharge) {
      await this.updateDepositCharge(manager, company, chargeAmount, depositDefaultChargeAmount);
    } else {
      await this.constructAndCreateDepositCharge(manager, company, chargeAmount, depositDefaultChargeAmount);
    }
  }

  private async updateDepositCharge(
    manager: EntityManager,
    company: TCreateOrUpdateDepositCharge,
    chargeAmount: number,
    depositDefaultChargeAmount: number,
  ): Promise<void> {
    if (company.isActive) {
      throw new BadRequestException(ECompaniesDepositChargeErrorCodes.CHARGE_CANNOT_CHANGE_BEFORE_EXECUTION);
    }

    await manager
      .getRepository(CompanyDepositCharge)
      .update({ company: { id: company.id } }, { depositChargeAmount: formatDecimalString(chargeAmount) });
    await this.updateCompanyDepositDefaultChargeAmount(manager, company, depositDefaultChargeAmount);
  }

  private async updateCompanyDepositDefaultChargeAmount(
    manager: EntityManager,
    company: TCreateOrUpdateDepositCharge,
    depositDefaultChargeAmount: number,
  ): Promise<void> {
    const needsUpdate =
      !company.depositDefaultChargeAmount || company.depositDefaultChargeAmount !== depositDefaultChargeAmount;

    if (needsUpdate) {
      await manager
        .getRepository(Company)
        .update({ id: company.id }, { depositDefaultChargeAmount: formatDecimalString(depositDefaultChargeAmount) });
    }
  }

  private async constructAndCreateDepositCharge(
    manager: EntityManager,
    company: TCreateOrUpdateDepositCharge,
    chargeAmount: number,
    depositDefaultChargeAmount: number,
  ): Promise<void> {
    const newDepositChargeDto = this.createDepositChargeDto(company, chargeAmount);
    await this.createDepositCharge(manager, newDepositChargeDto);

    await this.updateCompanyDepositDefaultChargeAmount(manager, company, depositDefaultChargeAmount);
  }

  private async createDepositCharge(manager: EntityManager, dto: IDepositCharge): Promise<void> {
    const depositChargeRepository = manager.getRepository(CompanyDepositCharge);

    const newDepositChargeDto = depositChargeRepository.create(dto);
    await depositChargeRepository.save(newDepositChargeDto);
  }

  private createDepositChargeDto(company: TCreateOrUpdateDepositCharge, chargeAmount: number): IDepositCharge {
    return {
      depositChargeAmount: formatDecimalString(chargeAmount),
      company: { id: company.id } as Company,
    };
  }

  private transformCompanyToNumbers(company: Company, depositDefaultChargeAmount: string): TCreateChargeRequest {
    return {
      ...company,
      depositAmount: company.depositAmount !== null ? parseDecimalNumber(company.depositAmount) : null,
      depositDefaultChargeAmount: parseDecimalNumber(depositDefaultChargeAmount),
    };
  }
}

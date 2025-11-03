import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { DataSource, EntityManager } from "typeorm";
import { TEN_PERCENT_MULTIPLIER } from "src/common/constants";
import { AccessControlService } from "src/modules/access-control/services";
import { CompanyIdOptionalDto } from "src/modules/companies/common/dto";
import { Company } from "src/modules/companies/entities";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import { ECompaniesDepositChargeErrorCodes } from "src/modules/companies-deposit-charge/common/enums";
import {
  IConstructAndCreateDepositChargeData,
  IDepositCharge,
  IUpdateDepositChargeData,
} from "src/modules/companies-deposit-charge/common/interfaces";
import {
  TCreateChargeRequestValidated,
  TCreateOrUpdateDepositCharge,
} from "src/modules/companies-deposit-charge/common/types";
import { CompanyDepositCharge } from "src/modules/companies-deposit-charge/entities";

@Injectable()
export class CompaniesDepositChargeManagementService {
  constructor(
    private readonly accessControlService: AccessControlService,
    private readonly dataSource: DataSource,
  ) {}

  public async createChargeRequest(user: ITokenUserData, dto: CompanyIdOptionalDto): Promise<void> {
    const company = await this.accessControlService.getCompanyByRole(user, { abnCheck: true }, dto.companyId);
    const validatedCompany = this.validateCompanyForChargeRequest(company);

    await this.dataSource.transaction(async (manager) => {
      await this.createOrUpdateDepositCharge(manager, validatedCompany, validatedCompany.depositDefaultChargeAmount);
    });
  }

  private validateCompanyForChargeRequest(company: Company | null): TCreateChargeRequestValidated {
    if (!company) {
      throw new NotFoundException(ECompaniesDepositChargeErrorCodes.COMPANY_NOT_FOUND);
    }

    if (!company.isActive) {
      throw new BadRequestException(ECompaniesDepositChargeErrorCodes.COMPANY_NOT_ACTIVE);
    }

    if (!company.depositDefaultChargeAmount) {
      throw new BadRequestException(ECompaniesDepositChargeErrorCodes.CHARGE_DEFAULT_AMOUNT_NOT_FILLED);
    }

    const tenPercentThreshold = company.depositDefaultChargeAmount * TEN_PERCENT_MULTIPLIER;

    if (company.depositAmount && company.depositAmount >= tenPercentThreshold) {
      throw new BadRequestException(ECompaniesDepositChargeErrorCodes.CHARGE_AMOUNT_ABOVE_MINIMUM);
    }

    return company as TCreateChargeRequestValidated;
  }

  public async createOrUpdateDepositCharge(
    manager: EntityManager,
    company: TCreateOrUpdateDepositCharge,
    depositDefaultChargeAmount: number,
  ): Promise<void> {
    const companyDepositChargeRepository = manager.getRepository(CompanyDepositCharge);

    const existedDepositCharge = await companyDepositChargeRepository.exists({
      where: { company: { id: company.id } },
    });

    const chargeAmount = this.calculateChargeAmount(company, depositDefaultChargeAmount);

    if (chargeAmount <= 0) {
      return;
    }

    if (existedDepositCharge) {
      await this.updateDepositCharge({ manager, company, chargeAmount, depositDefaultChargeAmount });
    } else {
      await this.constructAndCreateDepositCharge({ manager, company, chargeAmount, depositDefaultChargeAmount });
    }
  }

  private calculateChargeAmount(company: TCreateOrUpdateDepositCharge, depositDefaultChargeAmount: number): number {
    let chargeAmount: number = depositDefaultChargeAmount;

    if (company.depositAmount && company.depositAmount > 0) {
      chargeAmount = depositDefaultChargeAmount - company.depositAmount;
    }

    return chargeAmount;
  }

  private async updateDepositCharge(data: IUpdateDepositChargeData): Promise<void> {
    const { manager, company, chargeAmount, depositDefaultChargeAmount } = data;

    if (company.isActive) {
      throw new BadRequestException(ECompaniesDepositChargeErrorCodes.CHARGE_CANNOT_CHANGE_BEFORE_EXECUTION);
    }

    await manager
      .getRepository(CompanyDepositCharge)
      .update({ company: { id: company.id } }, { depositChargeAmount: chargeAmount });
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
      await manager.getRepository(Company).update({ id: company.id }, { depositDefaultChargeAmount });
    }
  }

  private async constructAndCreateDepositCharge(data: IConstructAndCreateDepositChargeData): Promise<void> {
    const { manager, company, chargeAmount, depositDefaultChargeAmount } = data;
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
      depositChargeAmount: chargeAmount,
      company: company as Company,
    };
  }
}

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PromoCampaign, PromoCampaignBanner } from "src/modules/promo-campaigns/entities";
import { IPromoCampaign } from "src/modules/promo-campaigns/common/interfaces";
import {
  EPromoCampaignDuration,
  EPromoCampaignStatus,
  EPromoCampaignTarget,
} from "src/modules/promo-campaigns/common/enums";
import {
  CreatePersonalPromoCampaignDto,
  CreateCorporatePromoCampaignDto,
  UpdatePromoCampaignDto,
  CreatePromoCampaignDto,
  GetAllPromoCampaignsDto,
} from "src/modules/promo-campaigns/common/dto";
import {
  PromoCampaignBannersService,
  PromoCampaignQueryOptionsService,
  PromoCampaignsAssignmentService,
  PromoCampaignsValidationService,
} from "src/modules/promo-campaigns/services";
import { Company } from "src/modules/companies/entities";
import {
  TConstructPromoCampaignDto,
  TCreateCorporatePromoCampaign,
  TGetAllPromoCampaigns,
  TGetSpecialPromoCampaigns,
  TRemoveOldPromoCampaigns,
  TUpdatePromoCampaign,
} from "src/modules/promo-campaigns/common/types";
import {
  findManyAndCountQueryBuilderTyped,
  findManyTyped,
  findOneOrFailQueryBuilderTyped,
  findOneOrFailTyped,
} from "src/common/utils";
import { GetAllPromoCampaignsOutput } from "src/modules/promo-campaigns/common/outputs";
import { UUIDParamDto } from "src/common/dto";
import { UNDEFINED_VALUE } from "src/common/constants";

@Injectable()
export class PromoCampaignsService {
  constructor(
    @InjectRepository(PromoCampaign)
    private readonly promoCampaignRepository: Repository<PromoCampaign>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly promoCampaignQueryOptionsService: PromoCampaignQueryOptionsService,
    private readonly promoCampaignsValidationService: PromoCampaignsValidationService,
    private readonly promoCampaignsAssignmentsService: PromoCampaignsAssignmentService,
    private readonly promoCampaignBannersService: PromoCampaignBannersService,
  ) {}

  public async getAllPromoCampaigns(dto: GetAllPromoCampaignsDto): Promise<GetAllPromoCampaignsOutput> {
    const queryBuilder = this.promoCampaignRepository.createQueryBuilder("promoCampaign");
    this.promoCampaignQueryOptionsService.getAllPromoCampaignsOptions(queryBuilder, dto);

    const [promoCampaigns, count] = await findManyAndCountQueryBuilderTyped<TGetAllPromoCampaigns[]>(queryBuilder);

    return {
      data: promoCampaigns,
      total: count,
      limit: dto.limit,
      offset: dto.offset,
    };
  }

  public async getSpecialPromoCampaigns(): Promise<TGetSpecialPromoCampaigns[]> {
    const queryOptions = this.promoCampaignQueryOptionsService.getSpecialPromoCampaignsOptions();
    const promoCampaigns = await findManyTyped<TGetSpecialPromoCampaigns[]>(this.promoCampaignRepository, queryOptions);

    return promoCampaigns;
  }

  public async getPromoCampaignById(paramDto: UUIDParamDto): Promise<PromoCampaign> {
    const queryBuilder = this.promoCampaignRepository.createQueryBuilder("promoCampaign");
    this.promoCampaignQueryOptionsService.getPromoCampaignById(queryBuilder, paramDto.id);

    return await findOneOrFailQueryBuilderTyped<PromoCampaign>(paramDto.id, queryBuilder, PromoCampaign.name);
  }

  public async createPersonalPromoCampaign(dto: CreatePersonalPromoCampaignDto): Promise<void> {
    await this.promoCampaignsValidationService.validatePersonalPromoCampaignCreate(dto);

    const newPromoCampaignDto = this.constructPersonalPromoCampaignDto(dto);
    await this.createPromoCampaign(newPromoCampaignDto);
  }

  public async createCorporatePromoCampaign(dto: CreateCorporatePromoCampaignDto): Promise<void> {
    const queryOptions = this.promoCampaignQueryOptionsService.createCorporatePromoCampaignOptions(dto.companyId);
    const company = await findOneOrFailTyped<TCreateCorporatePromoCampaign>(
      dto.companyId,
      this.companyRepository,
      queryOptions,
    );

    await this.promoCampaignsValidationService.validateCorporatePromoCampaignCreate(dto, company);

    const newPromoCampaignDto = this.constructCorporatePromoCampaignDto(dto);
    const savedPromoCampaign = await this.createPromoCampaign(newPromoCampaignDto);

    await this.promoCampaignsAssignmentsService.createOrUpdatePromoCampaignAssignment(savedPromoCampaign, company);
  }

  public async updatePromoCampaign(paramDto: UUIDParamDto, dto: UpdatePromoCampaignDto): Promise<void> {
    const queryOptions = this.promoCampaignQueryOptionsService.updatePromoCampaignOptions(paramDto.id);
    const promoCampaign = await findOneOrFailTyped<TUpdatePromoCampaign>(
      paramDto.id,
      this.promoCampaignRepository,
      queryOptions,
    );

    await this.promoCampaignsValidationService.validatePromoCampaignUpdate(dto, promoCampaign);

    if (dto.bannerId) {
      await this.promoCampaignBannersService.updateBannerRelationship(promoCampaign.id, dto.bannerId);
    }

    const promoCampaignDto = this.constructUpdatePromoCampaignDto(dto, promoCampaign);
    await this.promoCampaignRepository.update(promoCampaign.id, { ...promoCampaignDto });
  }

  private async createPromoCampaign(dto: IPromoCampaign): Promise<PromoCampaign> {
    const newPromoCampaignDto = this.promoCampaignRepository.create(dto);

    return await this.promoCampaignRepository.save(newPromoCampaignDto);
  }

  private constructPersonalPromoCampaignDto(dto: CreatePersonalPromoCampaignDto): IPromoCampaign {
    const determinedBanner = dto.bannerId
      ? this.promoCampaignRepository.manager.getRepository(PromoCampaignBanner).create({ id: dto.bannerId })
      : null;

    return this.constructPromoCampaignDto(dto, {
      target: dto.target,
      banner: determinedBanner,
      partnerName: dto.partnerName ?? null,
    });
  }

  private constructCorporatePromoCampaignDto(dto: CreateCorporatePromoCampaignDto): IPromoCampaign {
    return this.constructPromoCampaignDto(dto, {
      target: EPromoCampaignTarget.CORPORATE_COMPANY,
      banner: null,
      partnerName: null,
    });
  }

  private constructPromoCampaignDto(
    dto: CreatePromoCampaignDto,
    typeSpecificFields: TConstructPromoCampaignDto,
  ): IPromoCampaign {
    const determinedDuration = dto.endDate ? EPromoCampaignDuration.LIMITED : EPromoCampaignDuration.ALWAYS;

    return {
      name: dto.name,
      promoCode: dto.promoCode,
      discount: dto.discount,
      startDate: dto.startDate,
      duration: determinedDuration,
      application: dto.application,
      communicationTypes: dto.communicationTypes,
      schedulingTypes: dto.schedulingTypes,
      topics: dto.topics,
      interpreterTypes: dto.interpreterTypes,
      interpretingTypes: dto.interpretingTypes,
      discountMinutes: dto.discountMinutes ?? null,
      endDate: dto.endDate ?? null,
      usageLimit: dto.usageLimit ?? null,
      status: EPromoCampaignStatus.PENDING,
      bannerDisplay: dto.bannerDisplay,
      conditionsUrl: dto.conditionsUrl ?? null,
      ...typeSpecificFields,
    };
  }

  private constructUpdatePromoCampaignDto(
    dto: UpdatePromoCampaignDto,
    existingPromoCampaign: TUpdatePromoCampaign,
  ): Omit<IPromoCampaign, "banner"> {
    const endDate = dto.endDate !== UNDEFINED_VALUE ? dto.endDate : existingPromoCampaign.endDate;
    const determinedDuration = endDate ? EPromoCampaignDuration.LIMITED : EPromoCampaignDuration.ALWAYS;

    return {
      name: dto.name ?? existingPromoCampaign.name,
      promoCode: dto.promoCode ?? existingPromoCampaign.promoCode,
      discount: dto.discount ?? existingPromoCampaign.discount,
      startDate: dto.startDate ?? existingPromoCampaign.startDate,
      application: dto.application ?? existingPromoCampaign.application,
      communicationTypes: dto.communicationTypes ?? existingPromoCampaign.communicationTypes,
      schedulingTypes: dto.schedulingTypes ?? existingPromoCampaign.schedulingTypes,
      topics: dto.topics ?? existingPromoCampaign.topics,
      interpreterTypes: dto.interpreterTypes ?? existingPromoCampaign.interpreterTypes,
      interpretingTypes: dto.interpretingTypes ?? existingPromoCampaign.interpretingTypes,
      discountMinutes: dto.discountMinutes !== undefined ? dto.discountMinutes : existingPromoCampaign.discountMinutes,
      usageLimit: dto.usageLimit !== undefined ? dto.usageLimit : existingPromoCampaign.usageLimit,
      target: dto.target ?? existingPromoCampaign.target,
      partnerName: dto.partnerName ?? existingPromoCampaign.partnerName,
      status: dto.status ?? existingPromoCampaign.status,
      endDate: endDate,
      duration: determinedDuration,
      bannerDisplay: dto.bannerDisplay ?? existingPromoCampaign.bannerDisplay,
      conditionsUrl: dto.conditionsUrl !== undefined ? dto.conditionsUrl : existingPromoCampaign.conditionsUrl,
    };
  }

  public async updatePromoCampaignStatuses(): Promise<void> {
    const startPromoCampaigns = this.promoCampaignRepository.createQueryBuilder().update(PromoCampaign);
    const completePromoCampaigns = this.promoCampaignRepository.createQueryBuilder().update(PromoCampaign);

    this.promoCampaignQueryOptionsService.updatePromoCampaignStatusesOptions(
      startPromoCampaigns,
      completePromoCampaigns,
    );

    await startPromoCampaigns.execute();
    await completePromoCampaigns.execute();
  }

  public async removeOldPromoCampaigns(): Promise<void> {
    const YEARS = 3;

    const queryOptions = this.promoCampaignQueryOptionsService.removeOldPromoCampaignsOptions(YEARS);
    const promoCampaigns = await findManyTyped<TRemoveOldPromoCampaigns[]>(this.promoCampaignRepository, queryOptions);

    for (const promoCampaign of promoCampaigns) {
      if (promoCampaign.banner) {
        await this.promoCampaignBannersService.removePromoCampaignBannerFiles(promoCampaign.banner);
      }
    }

    await this.promoCampaignRepository.remove(promoCampaigns as PromoCampaign[]);
  }
}

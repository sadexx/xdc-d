import { Injectable } from "@nestjs/common";
import {
  Brackets,
  FindManyOptions,
  FindOneOptions,
  FindOptionsWhere,
  In,
  IsNull,
  LessThan,
  MoreThan,
  Not,
  Or,
  SelectQueryBuilder,
  UpdateQueryBuilder,
} from "typeorm";
import { Company } from "src/modules/companies/entities";
import {
  ApplyPromoCampaignUsageForExtensionQuery,
  AssignNewUserPromoCampaignQuery,
  AssignPromoCampaignQuery,
  AssignPromoCampaignUserRoleQuery,
  CreateCorporatePromoCampaignQuery,
  CreateOrUpdatePromoCampaignAssignmentQuery,
  GetPromoCampaignByIdQuery,
  GetSpecialPromoCampaignsQuery,
  RemoveOldPromoCampaignsQuery,
  RemoveUnusedPromoCampaignBannersQuery,
  UnassignPromoCampaignQuery,
  UpdatePromoCampaignBannerQuery,
  UpdatePromoCampaignQuery,
} from "src/modules/promo-campaigns/common/types";
import { PromoCampaign, PromoCampaignAssignment, PromoCampaignBanner } from "src/modules/promo-campaigns/entities";
import { UserRole } from "src/modules/users/entities";
import { GetAllPromoCampaignsDto, PromoCampaignAssignmentDto } from "src/modules/promo-campaigns/common/dto";
import {
  EPromoCampaignStatus,
  EPromoCampaignTarget,
  promoCampaignApplicationOrder,
  promoCampaignDurationOrder,
  promoCampaignStatusOrder,
  promoCampaignTargetOrder,
} from "src/modules/promo-campaigns/common/enums";
import { generateCaseForEnumOrder } from "src/common/utils";
import { subYears } from "date-fns";

@Injectable()
export class PromoCampaignQueryOptionsService {
  constructor() {}

  /**
   ** PromoCampaignsService
   */

  public getAllPromoCampaignsOptions(
    queryBuilder: SelectQueryBuilder<PromoCampaign>,
    dto: GetAllPromoCampaignsDto,
  ): void {
    queryBuilder.addSelect([
      "promoCampaign.id",
      "promoCampaign.name",
      "promoCampaign.promoCode",
      "promoCampaign.discount",
      "promoCampaign.discountMinutes",
      "promoCampaign.startDate",
      "promoCampaign.endDate",
      "promoCampaign.usageLimit",
      "promoCampaign.totalTimesUsed",
      "promoCampaign.partnerName",
      "promoCampaign.status",
      "promoCampaign.target",
      "promoCampaign.duration",
      "promoCampaign.application",
    ]);

    this.applyFilters(queryBuilder, dto);
    this.applyOrdering(queryBuilder, dto);
    queryBuilder.take(dto.limit);
    queryBuilder.skip(dto.offset);
  }

  private applyFilters(queryBuilder: SelectQueryBuilder<PromoCampaign>, dto: GetAllPromoCampaignsDto): void {
    if (dto.searchField) {
      this.applySearchFilter(queryBuilder, dto.searchField);
    }

    if (dto.statuses?.length) {
      queryBuilder.andWhere("promoCampaign.status IN (:...statuses)", { statuses: dto.statuses });
    }

    if (dto.targets?.length) {
      queryBuilder.andWhere("promoCampaign.target IN (:...targets)", { targets: dto.targets });
    }

    if (dto.durations?.length) {
      queryBuilder.andWhere("promoCampaign.duration IN (:...durations)", { durations: dto.durations });
    }

    if (dto.applications?.length) {
      queryBuilder.andWhere("promoCampaign.application IN (:...applications)", { applications: dto.applications });
    }

    if (dto.communicationTypes?.length) {
      queryBuilder.andWhere("promoCampaign.communicationTypes && :communicationTypes", {
        communicationTypes: dto.communicationTypes,
      });
    }

    if (dto.schedulingTypes?.length) {
      queryBuilder.andWhere("promoCampaign.schedulingTypes && :schedulingTypes", {
        schedulingTypes: dto.schedulingTypes,
      });
    }

    if (dto.topics?.length) {
      queryBuilder.andWhere("promoCampaign.topics && :topics", { topics: dto.topics });
    }

    if (dto.interpreterTypes?.length) {
      queryBuilder.andWhere("promoCampaign.interpreterTypes && :interpreterTypes", {
        interpreterTypes: dto.interpreterTypes,
      });
    }

    if (dto.interpretingTypes?.length) {
      queryBuilder.andWhere("promoCampaign.interpretingTypes && :interpretingTypes", {
        interpretingTypes: dto.interpretingTypes,
      });
    }

    if (dto.startDate) {
      queryBuilder.andWhere("promoCampaign.startDate >= :startDate", { startDate: dto.startDate });
    }

    if (dto.endDate) {
      queryBuilder.andWhere("promoCampaign.endDate <= :endDate", { endDate: dto.endDate });
    }
  }

  private applySearchFilter(queryBuilder: SelectQueryBuilder<PromoCampaign>, searchField: string): void {
    const searchTerm = `%${searchField}%`;
    queryBuilder.andWhere(
      new Brackets((qb) => {
        qb.andWhere("promoCampaign.name ILIKE :search", { search: searchTerm })
          .orWhere("promoCampaign.promoCode ILIKE :search", { search: searchTerm })
          .orWhere("promoCampaign.partnerName ILIKE :search", { search: searchTerm })
          .orWhere("CAST(promoCampaign.discount AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(promoCampaign.discountMinutes AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(promoCampaign.usageLimit AS TEXT) ILIKE :search", { search: searchTerm })
          .orWhere("CAST(promoCampaign.totalTimesUsed AS TEXT) ILIKE :search", { search: searchTerm });
      }),
    );
  }

  private applyOrdering(queryBuilder: SelectQueryBuilder<PromoCampaign>, dto: GetAllPromoCampaignsDto): void {
    if (dto.statusOrder) {
      const caseStatement = generateCaseForEnumOrder("promoCampaign.status", promoCampaignStatusOrder);
      queryBuilder.addSelect(caseStatement, "status_order");
      queryBuilder.addOrderBy("status_order", dto.statusOrder);
    }

    if (dto.targetOrder) {
      const caseStatement = generateCaseForEnumOrder("promoCampaign.target", promoCampaignTargetOrder);
      queryBuilder.addSelect(caseStatement, "target_order");
      queryBuilder.addOrderBy("target_order", dto.targetOrder);
    }

    if (dto.durationOrder) {
      const caseStatement = generateCaseForEnumOrder("promoCampaign.duration", promoCampaignDurationOrder);
      queryBuilder.addSelect(caseStatement, "duration_order");
      queryBuilder.addOrderBy("duration_order", dto.durationOrder);
    }

    if (dto.applicationOrder) {
      const caseStatement = generateCaseForEnumOrder("promoCampaign.application", promoCampaignApplicationOrder);
      queryBuilder.addSelect(caseStatement, "application_order");
      queryBuilder.addOrderBy("application_order", dto.applicationOrder);
    }

    if (dto.sortOrder) {
      queryBuilder.addOrderBy("promoCampaign.creationDate", dto.sortOrder);
    }

    if (dto.nameOrder) {
      queryBuilder.addOrderBy("promoCampaign.name", dto.nameOrder);
    }

    if (dto.promoCodeOrder) {
      queryBuilder.addOrderBy("promoCampaign.promoCode", dto.promoCodeOrder);
    }

    if (dto.discountOrder) {
      queryBuilder.addOrderBy("promoCampaign.discount", dto.discountOrder);
    }

    if (dto.discountMinutesOrder) {
      queryBuilder.addOrderBy("promoCampaign.discountMinutes", dto.discountMinutesOrder);
    }

    if (dto.usageLimitOrder) {
      queryBuilder.addOrderBy("promoCampaign.usageLimit", dto.usageLimitOrder);
    }

    if (dto.totalTimesUsedOrder) {
      queryBuilder.addOrderBy("promoCampaign.totalTimesUsed", dto.totalTimesUsedOrder);
    }

    if (dto.partnerNameOrder) {
      queryBuilder.addOrderBy("promoCampaign.partnerName", dto.partnerNameOrder);
    }
  }

  public getSpecialPromoCampaignsOptions(): FindManyOptions<PromoCampaign> {
    return {
      select: GetSpecialPromoCampaignsQuery.select,
      where: {
        target: In([EPromoCampaignTarget.GENERAL, EPromoCampaignTarget.ALL_NEW_PERSONAL]),
        status: EPromoCampaignStatus.ON_GOING,
        bannerDisplay: true,
        banner: { id: Not(IsNull()) },
      },
      relations: GetSpecialPromoCampaignsQuery.relations,
    };
  }

  public getPromoCampaignById(id: string): FindOneOptions<PromoCampaign> {
    return {
      select: GetPromoCampaignByIdQuery.select,
      where: { id },
      relations: GetPromoCampaignByIdQuery.relations,
    };
  }

  public createCorporatePromoCampaignOptions(companyId: string): FindOneOptions<Company> {
    return {
      select: CreateCorporatePromoCampaignQuery.select,
      where: { id: companyId },
    };
  }

  public updatePromoCampaignOptions(id: string): FindOneOptions<PromoCampaign> {
    return {
      select: UpdatePromoCampaignQuery.select,
      where: { id },
      relations: UpdatePromoCampaignQuery.relations,
    };
  }

  public updatePromoCampaignStatusesOptions(
    startQueryBuilder: UpdateQueryBuilder<PromoCampaign>,
    completeQueryBuilder: UpdateQueryBuilder<PromoCampaign>,
  ): void {
    const currentDate = new Date();
    startQueryBuilder
      .set({ status: EPromoCampaignStatus.ON_GOING })
      .where("status = :status", { status: EPromoCampaignStatus.PENDING })
      .andWhere("start_date <= :currentDate", { currentDate });
    completeQueryBuilder
      .set({ status: EPromoCampaignStatus.COMPLETED })
      .where("status = :status", { status: EPromoCampaignStatus.ON_GOING })
      .andWhere("end_date <= :currentDate", { currentDate });
  }

  public removeOldPromoCampaignsOptions(years: number): FindOneOptions<PromoCampaign> {
    const threeYearsAgo = subYears(new Date(), years);

    return {
      select: RemoveOldPromoCampaignsQuery.select,
      where: {
        status: In([EPromoCampaignStatus.COMPLETED, EPromoCampaignStatus.TERMINATED]),
        endDate: LessThan(threeYearsAgo),
      },
      relations: RemoveOldPromoCampaignsQuery.relations,
    };
  }

  /**
   ** PromoCampaignsAssignmentService
   */

  public assignPromoCampaignOptions(
    dto: PromoCampaignAssignmentDto,
    userRoleWhereCondition: FindOptionsWhere<UserRole>,
  ): { promoCampaign: FindOneOptions<PromoCampaign>; userRole: FindOneOptions<UserRole> } {
    return {
      promoCampaign: { select: AssignPromoCampaignQuery.select, where: { promoCode: dto.promoCode } },
      userRole: {
        select: AssignPromoCampaignUserRoleQuery.select,
        where: userRoleWhereCondition,
        relations: AssignPromoCampaignUserRoleQuery.relations,
      },
    };
  }

  public assignNewUserPromoCampaign(): FindOneOptions<PromoCampaign> {
    return {
      select: AssignNewUserPromoCampaignQuery.select,
      where: { target: EPromoCampaignTarget.ALL_NEW_PERSONAL, status: EPromoCampaignStatus.ON_GOING },
    };
  }

  public unassignPromoCampaignOptions(promoCode: string, userRoleId: string): FindOneOptions<PromoCampaignAssignment> {
    return {
      select: UnassignPromoCampaignQuery.select,
      where: { promoCampaign: { promoCode }, discountHolder: { userRole: { id: userRoleId } } },
    };
  }

  public createOrUpdatePromoCampaignAssignmentOptions(holderId: string): FindOneOptions<PromoCampaignAssignment> {
    return {
      select: CreateOrUpdatePromoCampaignAssignmentQuery.select,
      where: [{ discountHolder: { userRole: { id: holderId } } }, { discountHolder: { company: { id: holderId } } }],
    };
  }

  /**
   ** PromoCampaignBannersService
   */

  public updatePromoCampaignBannerOptions(bannerId: string): FindOneOptions<PromoCampaignBanner> {
    return {
      select: UpdatePromoCampaignBannerQuery.select,
      where: { id: bannerId },
    };
  }

  public removeUnusedPromoCampaignBannersOptions(): FindOneOptions<PromoCampaignBanner> {
    return {
      select: RemoveUnusedPromoCampaignBannersQuery.select,
      where: { promoCampaign: IsNull() },
    };
  }

  /**
   ** PromoCampaignsValidationService
   */

  public validateCorporatePromoCampaignCreateOptions(companyId: string): FindManyOptions<PromoCampaignAssignment> {
    return { where: { promoCampaign: { id: Not(IsNull()) }, discountHolder: { company: { id: companyId } } } };
  }

  public validatePromoCampaignUniquenessOptions(
    name: string | undefined,
    promoCode: string | undefined,
    excludeId?: string,
  ): FindManyOptions<PromoCampaign> {
    const whereConditions: FindOptionsWhere<PromoCampaign>[] = [];

    if (name) {
      const nameCondition: FindOptionsWhere<PromoCampaign> = { name };

      if (excludeId) {
        nameCondition.id = Not(excludeId);
      }

      whereConditions.push(nameCondition);
    }

    if (promoCode) {
      const promoCodeCondition: FindOptionsWhere<PromoCampaign> = { promoCode };

      if (excludeId) {
        promoCodeCondition.id = Not(excludeId);
      }

      whereConditions.push(promoCodeCondition);
    }

    return { where: whereConditions };
  }

  public validateAllNewPersonalConstraintsOptions(
    startDate: Date,
    endDate: Date | null,
    excludeId?: string,
  ): FindManyOptions<PromoCampaign> {
    const whereCondition: FindOptionsWhere<PromoCampaign> = {
      target: EPromoCampaignTarget.ALL_NEW_PERSONAL,
      status: In([EPromoCampaignStatus.ON_GOING, EPromoCampaignStatus.PENDING]),
    };

    if (excludeId) {
      whereCondition.id = Not(excludeId);
    }

    if (endDate) {
      whereCondition.startDate = LessThan(endDate);
      whereCondition.endDate = Or(IsNull(), MoreThan(startDate));
    } else {
      whereCondition.endDate = Or(IsNull(), MoreThan(startDate));
    }

    return {
      where: whereCondition,
    };
  }

  public validateBannerExistsOptions(bannerId: string): FindManyOptions<PromoCampaignBanner> {
    return { where: { id: bannerId } };
  }

  public validateAssignPersonalPromoCampaignOptions(
    id: string,
    userRoleId: string,
  ): FindManyOptions<PromoCampaignAssignment> {
    return { where: { promoCampaign: { id }, discountHolder: { userRole: { id: Not(userRoleId) } } } };
  }

  /**
   ** PromoCampaignsUsageService
   */

  public applyPromoCampaignUsageForExtensionOptions(userRoleId: string): FindOneOptions<PromoCampaignAssignment> {
    return {
      select: ApplyPromoCampaignUsageForExtensionQuery.select,
      where: { discountHolder: { userRole: { id: userRoleId } } },
    };
  }
}

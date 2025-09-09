import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { IMembershipDiscountData } from "src/modules/memberships/common/interfaces";
import { MembershipAssignment } from "src/modules/memberships/entities";
import { MembershipAssignmentsService, MembershipsUsageService } from "src/modules/memberships/services";
import { PromoCampaignAssignment } from "src/modules/promo-campaigns/entities";
import { PromoCampaignsUsageService, PromoCampaignsValidationService } from "src/modules/promo-campaigns/services";
import { IDiscountRate } from "src/modules/discounts/common/interfaces";
import {
  DiscountEntity,
  TApplyDiscountsForAppointmentValidated,
  TDiscountResult,
  TGetAssignedDiscountEntities,
} from "src/modules/discounts/common/types";
import { DiscountHolder } from "src/modules/discounts/entities";
import { DiscountQueryOptionsService } from "src/modules/discounts/services";
import { findOneTyped } from "src/common/utils";
import { IPromoCampaignDiscountData } from "src/modules/promo-campaigns/common/interfaces";

@Injectable()
export class DiscountsFetchService {
  constructor(
    @InjectRepository(DiscountHolder)
    private readonly discountHolderRepository: Repository<DiscountHolder>,
    private readonly discountQueryOptionsService: DiscountQueryOptionsService,
    private readonly membershipAssignmentsService: MembershipAssignmentsService,
    private readonly membershipsUsageService: MembershipsUsageService,
    private readonly promoCampaignsValidationService: PromoCampaignsValidationService,
    private readonly promoCampaignsUsageService: PromoCampaignsUsageService,
  ) {}

  public async fetchDiscountsForAppointment(
    manager: EntityManager,
    appointment: TApplyDiscountsForAppointmentValidated,
  ): Promise<IDiscountRate | null> {
    const assignedEntities = await this.getAssignedDiscountEntities(appointment);

    if (assignedEntities.length === 0) {
      return null;
    }

    const validatedDiscountEntities = this.validateDiscountEntities(assignedEntities, appointment);

    if (validatedDiscountEntities.length === 0) {
      return null;
    }

    const discountsResult = await this.fetchDiscountsFromEntities(manager, validatedDiscountEntities, appointment);

    const membershipResult = discountsResult.get(MembershipAssignment.name) as IMembershipDiscountData;
    const promoCampaignResult = discountsResult.get(PromoCampaignAssignment.name) as IPromoCampaignDiscountData;

    return this.buildDiscountRate(membershipResult, promoCampaignResult);
  }

  public async fetchDiscountsForExtension(
    businessExtensionTime: number,
    appointment: TApplyDiscountsForAppointmentValidated,
  ): Promise<IDiscountRate | null> {
    const assignedEntities = await this.getAssignedDiscountEntities(appointment);

    if (assignedEntities.length === 0) {
      return null;
    }

    const validatedDiscountEntities = this.validateDiscountEntities(assignedEntities, appointment);

    if (validatedDiscountEntities.length === 0) {
      return null;
    }

    const discountsResult = await this.fetchDiscountsFromEntitiesForExtension(
      businessExtensionTime,
      validatedDiscountEntities,
      appointment,
    );

    const membershipResult = discountsResult.get(MembershipAssignment.name) as IMembershipDiscountData;
    const promoCampaignResult = discountsResult.get(PromoCampaignAssignment.name) as IPromoCampaignDiscountData;

    return this.buildDiscountRate(membershipResult, promoCampaignResult);
  }

  private async getAssignedDiscountEntities(
    appointment: TApplyDiscountsForAppointmentValidated,
  ): Promise<DiscountEntity[]> {
    const queryOptions = this.discountQueryOptionsService.getAssignedDiscountEntitiesOptions(appointment.client);
    const discountHolder = await findOneTyped<TGetAssignedDiscountEntities>(
      this.discountHolderRepository,
      queryOptions,
    );

    if (!discountHolder) {
      return [];
    }

    const { membershipAssignment, promoCampaignAssignment } = discountHolder;
    const assignedEntities = [membershipAssignment, promoCampaignAssignment].filter(Boolean) as DiscountEntity[];

    return assignedEntities;
  }

  private validateDiscountEntities(
    assignedEntities: DiscountEntity[],
    appointment: TApplyDiscountsForAppointmentValidated,
  ): DiscountEntity[] {
    const validatedDiscountEntities: DiscountEntity[] = [];

    for (const discountEntity of assignedEntities) {
      if (this.validateDiscountEntity(discountEntity, appointment)) {
        validatedDiscountEntities.push(discountEntity);
      }
    }

    return validatedDiscountEntities;
  }

  private validateDiscountEntity(
    discountEntity: DiscountEntity,
    appointment: TApplyDiscountsForAppointmentValidated,
  ): boolean {
    if (discountEntity instanceof MembershipAssignment) {
      return this.membershipAssignmentsService.validateMembershipAssignmentAvailability(discountEntity, appointment);
    }

    if (discountEntity instanceof PromoCampaignAssignment) {
      return this.promoCampaignsValidationService.validatePromoCampaignAssignmentAvailability(
        discountEntity,
        appointment,
      );
    }

    return false;
  }

  private async fetchDiscountsFromEntities(
    manager: EntityManager,
    discountEntities: DiscountEntity[],
    appointment: TApplyDiscountsForAppointmentValidated,
  ): Promise<Map<string, TDiscountResult>> {
    const discountResultsMap = new Map<string, TDiscountResult>();

    for (const discountEntity of discountEntities) {
      const discountResult = await this.fetchDiscountFromEntity(
        manager,
        discountEntity,
        appointment,
        discountResultsMap,
      );

      if (discountResult) {
        discountResultsMap.set(discountEntity.constructor.name, discountResult);
      }
    }

    return discountResultsMap;
  }

  private async fetchDiscountFromEntity(
    manager: EntityManager,
    discountEntity: DiscountEntity,
    appointment: TApplyDiscountsForAppointmentValidated,
    discountResultsMap: Map<string, TDiscountResult>,
  ): Promise<TDiscountResult | null> {
    if (discountEntity instanceof MembershipAssignment) {
      return await this.membershipsUsageService.fetchAndApplyMembershipDiscount(manager, discountEntity, appointment);
    }

    if (discountEntity instanceof PromoCampaignAssignment) {
      const membershipResult = discountResultsMap.get(MembershipAssignment.name) as IMembershipDiscountData;
      const membershipFreeMinutes = membershipResult?.freeMinutes ?? 0;
      const membershipDiscount = membershipResult?.discount ?? 0;

      if (discountEntity.discount > membershipDiscount) {
        return await this.promoCampaignsUsageService.fetchAndApplyPromoCampaignDiscount(
          manager,
          discountEntity,
          appointment.schedulingDurationMin,
          membershipFreeMinutes,
        );
      }
    }

    return null;
  }

  private async fetchDiscountsFromEntitiesForExtension(
    businessExtensionTime: number,
    discountEntities: DiscountEntity[],
    appointment: TApplyDiscountsForAppointmentValidated,
  ): Promise<Map<string, TDiscountResult>> {
    const discountResultsMap = new Map<string, TDiscountResult>();

    for (const discountEntity of discountEntities) {
      const discountResult = await this.fetchDiscountFromEntityForExtension(
        businessExtensionTime,
        discountEntity,
        appointment,
        discountResultsMap,
      );

      if (discountResult) {
        discountResultsMap.set(discountEntity.constructor.name, discountResult);
      }
    }

    return discountResultsMap;
  }

  private async fetchDiscountFromEntityForExtension(
    businessExtensionTime: number,
    discountEntity: DiscountEntity,
    appointment: TApplyDiscountsForAppointmentValidated,
    discountResultsMap: Map<string, TDiscountResult>,
  ): Promise<TDiscountResult | null> {
    if (discountEntity instanceof MembershipAssignment) {
      return await this.membershipsUsageService.fetchAvailableMembershipDiscountForExtension(
        businessExtensionTime,
        appointment,
        discountEntity,
      );
    }

    if (discountEntity instanceof PromoCampaignAssignment) {
      const membershipResult = discountResultsMap.get(MembershipAssignment.name) as IMembershipDiscountData;
      const membershipFreeMinutes = membershipResult?.freeMinutes ?? 0;

      return await this.promoCampaignsUsageService.fetchPromoCampaignDiscountForExtension(
        businessExtensionTime,
        discountEntity,
        membershipFreeMinutes,
      );
    }

    return null;
  }

  private buildDiscountRate(
    membershipResult: IMembershipDiscountData | null,
    promoCampaignResult: IPromoCampaignDiscountData | null,
  ): IDiscountRate | null {
    const discountRate: IDiscountRate = {
      promoCampaignDiscount: promoCampaignResult?.discount ?? null,
      membershipDiscount: membershipResult?.discount ?? null,
      promoCampaignDiscountMinutes: promoCampaignResult?.discountMinutes ?? null,
      membershipFreeMinutes: membershipResult?.freeMinutes ?? null,
      promoCode: promoCampaignResult?.promoCode ?? null,
      membershipType: membershipResult?.membershipType ?? null,
    };
    const isEmptyResult = Object.values(discountRate).every((value) => value === null);

    return isEmptyResult ? null : discountRate;
  }
}

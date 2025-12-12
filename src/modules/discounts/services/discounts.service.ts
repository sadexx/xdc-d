import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { Appointment } from "src/modules/appointments/appointment/entities";
import { DiscountAssociation } from "src/modules/discounts/entities";
import { IDiscountRate } from "src/modules/discounts/common/interfaces";
import {
  DiscountAssociationsService,
  DiscountQueryOptionsService,
  DiscountsFetchService,
} from "src/modules/discounts/services";
import { findOneOrFailTyped, findOneTyped } from "src/common/utils";
import {
  DiscountEntityHolder,
  TApplyDiscountsForAppointment,
  TApplyDiscountsForAppointmentValidated,
  TApplyDiscountsForExtension,
  TFetchDiscountRate,
} from "src/modules/discounts/common/types";
import { MembershipsUsageService } from "src/modules/memberships/services";
import { PromoCampaignsAssignmentService, PromoCampaignsUsageService } from "src/modules/promo-campaigns/services";
import { ICompanyAuthorizationContext } from "src/modules/payments-analysis/common/interfaces/authorization";

@Injectable()
export class DiscountsService {
  constructor(
    @InjectRepository(DiscountAssociation)
    private readonly discountAssociationRepository: Repository<DiscountAssociation>,
    private readonly discountQueryOptionsService: DiscountQueryOptionsService,
    private readonly discountsFetchService: DiscountsFetchService,
    private readonly discountAssociationsService: DiscountAssociationsService,
    private readonly membershipsUsageService: MembershipsUsageService,
    private readonly promoCampaignsUsageService: PromoCampaignsUsageService,
    private readonly promoCampaignsAssignmentService: PromoCampaignsAssignmentService,
  ) {}

  public async fetchDiscountRate(appointmentId: string): Promise<IDiscountRate | undefined> {
    const queryOptions = this.discountQueryOptionsService.fetchDiscountRateOptions(appointmentId);
    const discountAssociation = await findOneTyped<TFetchDiscountRate>(
      this.discountAssociationRepository,
      queryOptions,
    );

    if (!discountAssociation) {
      return undefined;
    }

    return {
      promoCampaignDiscount: discountAssociation.promoCampaignDiscount,
      membershipDiscount: discountAssociation.membershipDiscount,
      promoCampaignDiscountMinutes: discountAssociation.promoCampaignDiscountMinutes,
      membershipFreeMinutes: discountAssociation.membershipFreeMinutes,
      promoCode: discountAssociation.promoCode,
      membershipType: discountAssociation.membershipType,
    };
  }

  public async fetchDiscountRateForExtension(
    businessExtensionTime: number,
    appointment: TApplyDiscountsForAppointment,
  ): Promise<IDiscountRate | undefined> {
    return this.discountsFetchService.fetchDiscountsForExtension(
      businessExtensionTime,
      appointment as TApplyDiscountsForAppointmentValidated,
    );
  }

  public async applyDiscountsForAppointment(manager: EntityManager, appointmentId: string): Promise<void> {
    const queryOptions = this.discountQueryOptionsService.applyDiscountsForAppointmentOptions(appointmentId);
    const appointment = await findOneOrFailTyped<TApplyDiscountsForAppointment>(
      appointmentId,
      manager.getRepository(Appointment),
      queryOptions,
    );

    if (!appointment.client) {
      return;
    }

    const discountResult = await this.discountsFetchService.fetchDiscountsForAppointment(
      manager,
      appointment as TApplyDiscountsForAppointmentValidated,
    );

    if (discountResult) {
      await this.discountAssociationsService.createOrUpdateDiscountAssociation(manager, appointment, discountResult);
    }
  }

  public async applyDiscountsForExtension(
    manager: EntityManager,
    appointment: TApplyDiscountsForExtension,
    discounts: IDiscountRate,
    companyContext: ICompanyAuthorizationContext | null,
  ): Promise<void> {
    if (discounts.membershipFreeMinutes) {
      await this.membershipsUsageService.deductFreeMinutes(manager, appointment, discounts.membershipFreeMinutes);
    }

    if (discounts.promoCampaignDiscount || discounts.promoCampaignDiscountMinutes) {
      await this.promoCampaignsUsageService.applyPromoCampaignUsageForExtension(
        manager,
        appointment,
        discounts.promoCampaignDiscountMinutes,
        companyContext,
      );
    }

    await this.discountAssociationsService.createOrUpdateDiscountAssociation(manager, appointment, discounts);
  }

  public async applyDiscountsForNewUsers(holder: DiscountEntityHolder): Promise<void> {
    await this.promoCampaignsAssignmentService.assignNewUserPromoCampaign(holder);
  }
}

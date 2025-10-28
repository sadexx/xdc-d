import { forwardRef, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UNDEFINED_VALUE } from "src/common/constants";
import { findOneOrFailTyped } from "src/common/utils";
import { EExtCountry } from "src/modules/addresses/common/enums";
import { QueueInitializeService } from "src/modules/queues/services";
import { membershipRegionPricingMap } from "src/modules/memberships/common/constants";
import { UpdateMembershipPriceDto } from "src/modules/memberships/common/dto";
import {
  EMembershipPricingRegion,
  EMembershipNotificationType,
  EMembershipErrorCodes,
} from "src/modules/memberships/common/enums";
import { IGetMembershipPrice } from "src/modules/memberships/common/interfaces";
import {
  TGetMembershipPriceMembership,
  TGetMembershipPriceUserRole,
  TUpdateMembershipPrice,
  TUpdateExistingMembershipSubscriptions,
} from "src/modules/memberships/common/types";
import { Membership, MembershipPrice } from "src/modules/memberships/entities";
import { MembershipPaymentsService, MembershipsQueryOptionsService } from "src/modules/memberships/services";
import { LokiLogger } from "src/common/logger";

@Injectable()
export class MembershipsPriceService {
  private readonly lokiLogger = new LokiLogger(MembershipsPriceService.name);
  constructor(
    @InjectRepository(Membership)
    private readonly membershipRepository: Repository<Membership>,
    @InjectRepository(MembershipPrice)
    private readonly membershipPriceRepository: Repository<MembershipPrice>,
    @Inject(forwardRef(() => MembershipPaymentsService))
    private readonly membershipPaymentsService: MembershipPaymentsService,
    private readonly membershipsQueryOptionsService: MembershipsQueryOptionsService,
    private readonly queueInitializeService: QueueInitializeService,
  ) {}

  public getMembershipPrice(
    membership: TGetMembershipPriceMembership,
    userRole: TGetMembershipPriceUserRole,
  ): IGetMembershipPrice {
    const pricingRegion = this.getMembershipPricingRegion(userRole.country);
    const membershipPrice = membership.membershipPrices.find((price) => price.region === pricingRegion);

    if (!membershipPrice) {
      this.lokiLogger.error(`Price not found for Membership with id: ${membership.id} in region: ${pricingRegion}.`);
      throw new NotFoundException(EMembershipErrorCodes.PRICE_NOT_FOUND_FOR_REGION);
    }

    return {
      price: Number(membershipPrice.price) + Number(membershipPrice.gstAmount || 0),
      gstAmount: Number(membershipPrice.gstAmount),
      currency: membershipPrice.currency,
      stripePriceId: membershipPrice.stripePriceId,
    };
  }

  public getMembershipPricingRegion(country: string | null): EMembershipPricingRegion {
    return membershipRegionPricingMap[country as EExtCountry] ?? EMembershipPricingRegion.GLOBAL;
  }

  public async updateMembershipPrice(id: string, dto: UpdateMembershipPriceDto): Promise<void> {
    const membershipPriceQueryOptions = this.membershipsQueryOptionsService.updateMembershipPriceOptions(id);
    const membershipPrice = await findOneOrFailTyped<TUpdateMembershipPrice>(
      id,
      this.membershipPriceRepository,
      membershipPriceQueryOptions,
    );

    const isPriceChanged = dto.price !== UNDEFINED_VALUE && dto.price !== membershipPrice.price;
    const isGstAmountChanged = dto.gstAmount !== UNDEFINED_VALUE && dto.gstAmount !== membershipPrice.gstAmount;

    if (!isPriceChanged && !isGstAmountChanged) {
      return;
    }

    const newStripePriceId = await this.membershipPaymentsService.updateStripePrice(dto, membershipPrice);
    await this.membershipPriceRepository.update(id, {
      price: dto.price,
      gstAmount: dto.gstAmount,
      stripePriceId: newStripePriceId,
    });

    await this.updateExistingMembershipSubscriptions(membershipPrice, newStripePriceId);
  }

  private async updateExistingMembershipSubscriptions(
    membershipPrice: TUpdateMembershipPrice,
    newStripePriceId: string,
  ): Promise<void> {
    const { membership } = membershipPrice;

    const customerIds: string[] = [];
    for (const membershipAssignment of membership.currentMemberships || []) {
      const userRole = membershipAssignment.discountHolder.userRole;
      const customerId = userRole?.paymentInformation?.stripeClientAccountId;

      if (customerId) {
        customerIds.push(customerId);
      }
    }

    if (customerIds.length > 0) {
      await this.queueInitializeService.addSubscriptionsUpdatePriceQueue(customerIds, newStripePriceId);
    }

    const updatedMembershipQueryOptions =
      this.membershipsQueryOptionsService.updateExistingMembershipSubscriptionsOptions(membership.id);
    const updatedMembership = await findOneOrFailTyped<TUpdateExistingMembershipSubscriptions>(
      membership.id,
      this.membershipRepository,
      updatedMembershipQueryOptions,
    );

    await this.queueInitializeService.addNotifyUsersAboutMembershipChangesQueue(
      updatedMembership,
      EMembershipNotificationType.PRICE_UPDATE,
      membershipPrice.region,
    );
  }
}

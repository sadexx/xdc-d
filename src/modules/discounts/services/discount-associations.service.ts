import { Injectable } from "@nestjs/common";
import { EntityManager } from "typeorm";
import { DiscountAssociation } from "src/modules/discounts/entities";
import { IDiscountAssociation, IDiscountRate } from "src/modules/discounts/common/interfaces";
import {
  TCreateOrUpdateDiscountAssociation,
  TCreateOrUpdateDiscountAssociationAppointment,
} from "src/modules/discounts/common/types";
import { DiscountQueryOptionsService } from "src/modules/discounts/services";
import { findOneTyped } from "src/common/utils";

@Injectable()
export class DiscountAssociationsService {
  constructor(private readonly discountQueryOptionsService: DiscountQueryOptionsService) {}

  public async createOrUpdateDiscountAssociation(
    manager: EntityManager,
    appointment: TCreateOrUpdateDiscountAssociationAppointment,
    discountRate: IDiscountRate,
  ): Promise<void> {
    const queryOptions = this.discountQueryOptionsService.createOrUpdateDiscountAssociationOptions(appointment.id);
    const discountAssociation = await findOneTyped<TCreateOrUpdateDiscountAssociation>(
      manager.getRepository(DiscountAssociation),
      queryOptions,
    );

    if (!discountAssociation) {
      await this.constructAndCreateDiscountAssociation(manager, appointment, discountRate);
    } else {
      await this.updateDiscountAssociation(manager, discountAssociation, discountRate);
    }
  }

  private async constructAndCreateDiscountAssociation(
    manager: EntityManager,
    appointment: TCreateOrUpdateDiscountAssociationAppointment,
    discountRate: IDiscountRate,
  ): Promise<void> {
    const createDiscountAssociationDto = this.constructDiscountAssociationDto(discountRate, appointment);
    await this.createDiscountAssociation(manager, createDiscountAssociationDto);
  }

  private async createDiscountAssociation(manager: EntityManager, dto: IDiscountAssociation): Promise<void> {
    const discountAssociationRepository = manager.getRepository(DiscountAssociation);

    const newDiscountAssociation = discountAssociationRepository.create(dto);
    await discountAssociationRepository.save(newDiscountAssociation);
  }

  private async updateDiscountAssociation(
    manager: EntityManager,
    discountAssociation: TCreateOrUpdateDiscountAssociation,
    discountRate: IDiscountRate,
  ): Promise<void> {
    const discountAssociationDto = this.constructDiscountAssociationDto(discountRate);
    await manager.getRepository(DiscountAssociation).update({ id: discountAssociation.id }, discountAssociationDto);
  }

  private constructDiscountAssociationDto(
    discountRate: IDiscountRate,
    appointment?: TCreateOrUpdateDiscountAssociationAppointment,
  ): IDiscountAssociation {
    return {
      promoCampaignDiscount: discountRate.promoCampaignDiscount,
      membershipDiscount: discountRate.membershipDiscount,
      promoCampaignDiscountMinutes: discountRate.promoCampaignDiscountMinutes,
      membershipFreeMinutes: discountRate.membershipFreeMinutes,
      promoCode: discountRate.promoCode,
      membershipType: discountRate.membershipType,
      appointment,
    };
  }
}

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DiscountHolder } from "src/modules/discounts/entities";
import { PromoCampaignAssignment } from "src/modules/promo-campaigns/entities";
import { UserRole } from "src/modules/users/entities";
import { Company } from "src/modules/companies/entities";
import { IDiscountHolder } from "src/modules/discounts/common/interfaces";
import {
  DiscountEntity,
  DiscountEntityHolder,
  TCreateOrUpdateDiscountHolder,
} from "src/modules/discounts/common/types";
import { MembershipAssignment } from "src/modules/memberships/entities";
import { DiscountQueryOptionsService } from "src/modules/discounts/services";
import { findOneTyped } from "src/common/utils";

@Injectable()
export class DiscountHoldersService {
  constructor(
    @InjectRepository(DiscountHolder)
    private readonly discountHolderRepository: Repository<DiscountHolder>,
    private readonly discountQueryOptionsService: DiscountQueryOptionsService,
  ) {}

  public async createOrUpdateDiscountHolder(
    holder: DiscountEntityHolder,
    discountEntity: DiscountEntity,
  ): Promise<void> {
    const queryOptions = this.discountQueryOptionsService.createOrUpdateDiscountHolderOptions(holder.id);
    const discountHolder = await findOneTyped<TCreateOrUpdateDiscountHolder>(
      this.discountHolderRepository,
      queryOptions,
    );

    const discountHolderDto = this.constructDiscountHolderDto(holder, discountEntity, discountHolder);

    if (!discountHolder) {
      await this.createDiscountHolder(discountHolderDto);
    } else {
      await this.updateDiscountHolder(discountHolderDto, discountHolder);
    }
  }

  private async createDiscountHolder(dto: IDiscountHolder): Promise<void> {
    const newDiscountHolder = this.discountHolderRepository.create(dto);
    await this.discountHolderRepository.save(newDiscountHolder);
  }

  private async updateDiscountHolder(
    dto: IDiscountHolder,
    discountHolder: TCreateOrUpdateDiscountHolder,
  ): Promise<void> {
    await this.discountHolderRepository.update(discountHolder.id, dto);
  }

  private constructDiscountHolderDto(
    holder: DiscountEntityHolder,
    discountEntity: DiscountEntity,
    discountHolder: TCreateOrUpdateDiscountHolder | null,
  ): IDiscountHolder {
    return {
      ...discountHolder,
      userRole: holder instanceof UserRole ? holder : null,
      company: holder instanceof Company ? holder : null,
      promoCampaignAssignment: discountEntity instanceof PromoCampaignAssignment ? discountEntity : null,
      membershipAssignment: discountEntity instanceof MembershipAssignment ? discountEntity : null,
    };
  }
}

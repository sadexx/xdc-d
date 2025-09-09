import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOptionsWhere, Repository } from "typeorm";
import { PromoCampaign, PromoCampaignAssignment } from "src/modules/promo-campaigns/entities";
import { DiscountEntityHolder } from "src/modules/discounts/common/types";
import { IPromoCampaignAssignment } from "src/modules/promo-campaigns/common/interfaces";
import { DiscountHoldersService } from "src/modules/discounts/services";
import { PromoCampaignAssignmentDto } from "src/modules/promo-campaigns/common/dto";
import { ITokenUserData } from "src/modules/tokens/common/interfaces";
import {
  PromoCampaignQueryOptionsService,
  PromoCampaignsValidationService,
} from "src/modules/promo-campaigns/services";
import { UserRole } from "src/modules/users/entities";
import { AccessControlService } from "src/modules/access-control/services";
import { findOneOrFailTyped, findOneTyped } from "src/common/utils";
import {
  TAssignNewUserPromoCampaign,
  TAssignPromoCampaign,
  TAssignPromoCampaignUserRole,
  TCreateOrUpdatePromoCampaignAssignment,
  TCreateOrUpdatePromoCampaignAssignmentPromoCampaign,
} from "src/modules/promo-campaigns/common/types";
import { IMessageOutput } from "src/common/outputs";

@Injectable()
export class PromoCampaignsAssignmentService {
  constructor(
    @InjectRepository(PromoCampaignAssignment)
    private readonly promoCampaignAssignmentRepository: Repository<PromoCampaignAssignment>,
    @InjectRepository(PromoCampaign)
    private readonly promoCampaignRepository: Repository<PromoCampaign>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly promoCampaignsQueryOptionsService: PromoCampaignQueryOptionsService,
    private readonly promoCampaignsValidationService: PromoCampaignsValidationService,
    private readonly discountHoldersService: DiscountHoldersService,
    private readonly accessControlService: AccessControlService,
  ) {}

  public async assignPromoCampaign(
    dto: PromoCampaignAssignmentDto,
    user: ITokenUserData,
  ): Promise<void | IMessageOutput> {
    const isAdminOperation = this.accessControlService.checkAdminRoleForOperation(dto, user);
    const userRoleWhereCondition: FindOptionsWhere<UserRole> = isAdminOperation
      ? { id: dto.userRoleId }
      : { id: user.userRoleId };

    const queryOptions = this.promoCampaignsQueryOptionsService.assignPromoCampaignOptions(dto, userRoleWhereCondition);

    const promoCampaign = await findOneOrFailTyped<TAssignPromoCampaign>(
      dto.promoCode,
      this.promoCampaignRepository,
      queryOptions.promoCampaign,
      "promoCode",
    );
    const userRole = await findOneOrFailTyped<TAssignPromoCampaignUserRole>(
      dto.userRoleId ?? user.userRoleId,
      this.userRoleRepository,
      queryOptions.userRole,
    );

    if (userRole.discountHolder?.promoCampaignAssignment && !dto.replaceExisting) {
      return {
        message: "Promo campaign already assigned to user role. Do you want to replace it with the new one?",
      };
    }

    await this.promoCampaignsValidationService.validateAssignPromoCampaign(user, promoCampaign, userRole);

    await this.createOrUpdatePromoCampaignAssignment(promoCampaign, userRole);
  }

  public async assignNewUserPromoCampaign(holder: DiscountEntityHolder): Promise<void> {
    const queryOptions = this.promoCampaignsQueryOptionsService.assignNewUserPromoCampaign();
    const promoCampaign = await findOneTyped<TAssignNewUserPromoCampaign>(this.promoCampaignRepository, queryOptions);

    if (!promoCampaign) {
      return;
    }

    await this.createOrUpdatePromoCampaignAssignment(promoCampaign, holder);
  }

  public async unassignPersonalPromoCampaign(dto: PromoCampaignAssignmentDto, user: ITokenUserData): Promise<void> {
    this.accessControlService.checkAdminRoleForOperation(dto, user);

    const queryOptions = this.promoCampaignsQueryOptionsService.unassignPromoCampaignOptions(
      dto.promoCode,
      dto.userRoleId ?? user.userRoleId,
    );
    const promoCampaignAssignment = await findOneOrFailTyped<TAssignNewUserPromoCampaign>(
      dto.promoCode,
      this.promoCampaignAssignmentRepository,
      queryOptions,
      "promoCode",
    );

    await this.promoCampaignAssignmentRepository.delete(promoCampaignAssignment.id);
  }

  public async createOrUpdatePromoCampaignAssignment(
    promoCampaign: TCreateOrUpdatePromoCampaignAssignmentPromoCampaign,
    holder: DiscountEntityHolder,
  ): Promise<void> {
    const queryOptions = this.promoCampaignsQueryOptionsService.createOrUpdatePromoCampaignAssignmentOptions(holder.id);
    const existingPromoCampaignAssignment = await findOneTyped<TCreateOrUpdatePromoCampaignAssignment>(
      this.promoCampaignAssignmentRepository,
      queryOptions,
    );

    const promoCampaignAssignmentDto = this.constructPromoCampaignAssignmentDto(promoCampaign);

    if (!existingPromoCampaignAssignment) {
      await this.constructAndCreatePromoCampaignAssignment(promoCampaignAssignmentDto, holder);
    } else {
      await this.updatePromoCampaignAssignment(existingPromoCampaignAssignment.id, promoCampaignAssignmentDto);
    }
  }

  private async constructAndCreatePromoCampaignAssignment(
    dto: IPromoCampaignAssignment,
    holder: DiscountEntityHolder,
  ): Promise<void> {
    const savedPromoCampaignAssignment = await this.createPromoCampaignAssignment(dto);
    await this.discountHoldersService.createOrUpdateDiscountHolder(holder, savedPromoCampaignAssignment);
  }

  private async createPromoCampaignAssignment(dto: IPromoCampaignAssignment): Promise<PromoCampaignAssignment> {
    const newPromoCampaignAssignmentDto = this.promoCampaignAssignmentRepository.create(dto);

    return await this.promoCampaignAssignmentRepository.save(newPromoCampaignAssignmentDto);
  }

  private async updatePromoCampaignAssignment(id: string, dto: IPromoCampaignAssignment): Promise<void> {
    await this.promoCampaignAssignmentRepository.update(id, dto);
  }

  private constructPromoCampaignAssignmentDto(
    promoCampaign: TCreateOrUpdatePromoCampaignAssignmentPromoCampaign,
  ): IPromoCampaignAssignment {
    return {
      discount: promoCampaign.discount,
      discountMinutes: promoCampaign.discountMinutes,
      remainingUses: promoCampaign.usageLimit,
      promoCampaign: promoCampaign,
    };
  }
}

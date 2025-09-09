import { IsIn, IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";
import { EPromoCampaignTarget } from "src/modules/promo-campaigns/common/enums";
import { CreatePromoCampaignDto } from "src/modules/promo-campaigns/common/dto";
import { TPersonalPromoCampaignDtoTarget } from "src/modules/promo-campaigns/common/types";
import { IsValidPersonalPromoCampaignFields } from "src/modules/promo-campaigns/common/validators";

export class CreatePersonalPromoCampaignDto extends CreatePromoCampaignDto {
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  partnerName?: string;

  @IsOptional()
  @IsUUID()
  bannerId?: string;

  @IsIn([EPromoCampaignTarget.GENERAL, EPromoCampaignTarget.PERSONAL, EPromoCampaignTarget.ALL_NEW_PERSONAL])
  @IsValidPersonalPromoCampaignFields()
  target: TPersonalPromoCampaignDtoTarget;
}

import { IsEnum, IsOptional, IsUUID } from "class-validator";
import { EPromoCampaignBannerType } from "src/modules/promo-campaigns/common/enums";

export class UploadPromoCampaignBannerDto {
  @IsOptional()
  @IsUUID()
  bannerId?: string;

  @IsEnum(EPromoCampaignBannerType)
  promoBannerType: EPromoCampaignBannerType;
}

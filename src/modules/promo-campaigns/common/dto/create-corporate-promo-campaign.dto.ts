import { IsNotEmpty, IsUUID, IsBoolean } from "class-validator";
import { CreatePromoCampaignDto } from "src/modules/promo-campaigns/common/dto";

export class CreateCorporatePromoCampaignDto extends CreatePromoCampaignDto {
  @IsUUID()
  companyId: string;

  @IsNotEmpty()
  @IsBoolean()
  validateHolder: boolean;
}

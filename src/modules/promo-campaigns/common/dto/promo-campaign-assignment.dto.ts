import { IsOptional, IsUUID, IsNotEmpty, IsString, IsUppercase, Length, IsBoolean } from "class-validator";
import { IsBooleanTrue } from "src/common/validators";

export class PromoCampaignAssignmentDto {
  @IsOptional()
  @IsUUID()
  userRoleId?: string;

  @IsNotEmpty()
  @IsString()
  @IsUppercase()
  @Length(10, 10)
  promoCode: string;

  @IsOptional()
  @IsBoolean()
  @IsBooleanTrue()
  replaceExisting?: boolean;
}

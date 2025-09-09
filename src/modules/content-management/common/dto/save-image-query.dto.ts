import { IsEnum, IsOptional } from "class-validator";
import { ELandingPart } from "src/modules/content-management/common/enums";

export class SaveImageQueryDto {
  @IsOptional()
  @IsEnum(ELandingPart)
  landingPart: ELandingPart;
}

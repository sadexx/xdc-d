import { IsBoolean, IsOptional } from "class-validator";
import { IsWithinNext24Hours } from "src/modules/interpreters/profile/common/validators";

export class SetInterpreterOnlineDto {
  @IsOptional()
  @IsBoolean()
  isOnlineForAudio?: boolean;

  @IsOptional()
  @IsBoolean()
  isOnlineForVideo?: boolean;

  @IsOptional()
  @IsBoolean()
  isOnlineForFaceToFace?: boolean;

  @IsOptional()
  @IsWithinNext24Hours()
  endOfWorkDay?: Date;
}

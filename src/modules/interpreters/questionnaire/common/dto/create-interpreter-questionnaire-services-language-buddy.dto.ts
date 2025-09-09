import { IsBoolean, IsOptional, IsUUID } from "class-validator";

export class CreateInterpreterQuestionnaireServicesLanguageBuddyDto {
  @IsOptional()
  @IsUUID()
  userRoleId?: string;

  @IsOptional()
  @IsBoolean()
  audioOnDemandSetting?: boolean;

  @IsOptional()
  @IsBoolean()
  videoOnDemandSetting?: boolean;

  @IsOptional()
  @IsBoolean()
  faceToFaceOnDemandSetting?: boolean;

  @IsOptional()
  @IsBoolean()
  audioPreBookedSetting?: boolean;

  @IsOptional()
  @IsBoolean()
  videoPreBookedSetting?: boolean;

  @IsOptional()
  @IsBoolean()
  faceToFacePreBookedSetting?: boolean;

  @IsBoolean()
  consecutiveGeneralSetting: boolean = true;
}

import { IsBoolean, IsEnum, IsOptional, IsUUID } from "class-validator";
import { EInterpreterExperienceYears } from "src/modules/interpreters/questionnaire/common/enum";

export class CreateInterpreterQuestionnaireDto {
  @IsOptional()
  @IsUUID()
  userRoleId?: string;

  @IsOptional()
  @IsEnum(EInterpreterExperienceYears)
  experienceYears?: EInterpreterExperienceYears;

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

  @IsOptional()
  @IsBoolean()
  consecutiveLegalSetting?: boolean;

  @IsOptional()
  @IsBoolean()
  consecutiveMedicalSetting?: boolean;

  @IsOptional()
  @IsBoolean()
  conferenceSimultaneousSetting?: boolean;

  @IsOptional()
  @IsBoolean()
  signLanguageSetting?: boolean;

  @IsOptional()
  @IsBoolean()
  consecutiveGeneralSetting?: boolean;
}

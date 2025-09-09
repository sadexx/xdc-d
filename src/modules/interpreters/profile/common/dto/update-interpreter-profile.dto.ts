import { IsBoolean, IsOptional, IsUUID } from "class-validator";

export class UpdateInterpreterProfileDto {
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

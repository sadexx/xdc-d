import { IsEnum, IsOptional, IsString, IsUUID } from "class-validator";
import { EExtIssueState } from "src/modules/backy-check/common/enums";

export class StartWWCCDto {
  @IsOptional()
  @IsUUID()
  userRoleId?: string;

  @IsString()
  WWCCNumber: string;

  @IsString()
  expiredDate: Date;

  @IsEnum(EExtIssueState)
  @IsString()
  issueState: EExtIssueState;
}

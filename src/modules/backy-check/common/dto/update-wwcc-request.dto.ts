import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";
import { EExtCheckResult, EExtCheckStatus, EExtIssueState } from "src/modules/backy-check/common/enums";

export class UpdateWWCCDto {
  @IsNotEmpty()
  @IsUUID()
  id: string;

  @IsOptional()
  @IsString()
  WWCCNumber?: string;

  @IsOptional()
  @IsDateString()
  expiredDate?: Date;

  @IsOptional()
  @IsEnum(EExtIssueState)
  issueState?: EExtIssueState;

  @IsOptional()
  @IsEnum(EExtCheckStatus)
  checkStatus?: EExtCheckStatus;

  @IsOptional()
  @IsEnum(EExtCheckResult)
  checkResults?: EExtCheckResult;

  @IsOptional()
  @IsString()
  checkResultsNotes?: string;

  @IsOptional()
  @IsString()
  orderOfficerNotes?: string;
}

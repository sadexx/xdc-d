import { IsEnum, IsUUID } from "class-validator";
import { ECompanySubStatus } from "src/modules/companies/common/enums";

export class UpdateCompanySubStatusDto {
  @IsUUID()
  id: string;

  @IsEnum(ECompanySubStatus)
  subStatus: ECompanySubStatus;
}

import { IsOptional, IsUUID } from "class-validator";
import { GetUserByAbnDto } from "src/modules/abn/common/dto";

export class GetCompanyByAbnDto extends GetUserByAbnDto {
  @IsOptional()
  @IsUUID()
  companyId?: string;
}

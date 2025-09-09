import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { CommaSeparatedToArray } from "src/common/decorators";
import { ECompanyType } from "src/modules/companies/common/enums";

export class GetDropdownCompaniesDto {
  @IsOptional()
  @CommaSeparatedToArray()
  @IsEnum(ECompanyType, { each: true })
  companyTypes?: ECompanyType[];

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  searchField?: string;
}

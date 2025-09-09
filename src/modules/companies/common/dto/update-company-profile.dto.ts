import { IsOptional, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { UpdateCompanyAddressDto } from "src/modules/addresses/common/dto";
import { UpdateCompanyProfileInformationDto } from "src/modules/companies/common/dto";

export class UpdateCompanyProfileDto {
  @ValidateNested()
  @Type(() => UpdateCompanyProfileInformationDto)
  profileInformation: UpdateCompanyProfileInformationDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateCompanyAddressDto)
  residentialAddress?: UpdateCompanyAddressDto;
}

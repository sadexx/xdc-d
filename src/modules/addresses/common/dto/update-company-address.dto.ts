import { IsEnum, IsLatitude, IsLongitude, IsOptional, IsString, IsTimeZone, Length } from "class-validator";
import { EExtCountry } from "src/modules/addresses/common/enums";
import { CountryCodeTransformer } from "src/modules/addresses/common/decorators";

export class UpdateCompanyAddressDto {
  @IsLatitude()
  latitude: number;

  @IsLongitude()
  longitude: number;

  @CountryCodeTransformer()
  @IsEnum(EExtCountry)
  country: string;

  @IsString()
  @Length(1, 100)
  state: string;

  @IsString()
  @Length(1, 100)
  suburb: string;

  @IsString()
  @Length(1, 100)
  streetName: string;

  @IsString()
  @Length(1, 10)
  streetNumber: string;

  @IsString()
  @Length(1, 50)
  postcode: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  building?: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  unit?: string;

  @IsOptional()
  @IsTimeZone()
  @Length(1, 50)
  timezone?: string;
}

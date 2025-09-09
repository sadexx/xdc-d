import { IsEnum, IsLatitude, IsLongitude, IsOptional, IsString, IsTimeZone, Length } from "class-validator";
import { EExtCountry } from "src/modules/addresses/common/enums";
import { CountryCodeTransformer } from "src/modules/addresses/common/decorators";

export class CreateAddressDto {
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

  @IsOptional()
  @IsString()
  @Length(1, 100)
  streetName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 10)
  streetNumber?: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  postcode?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  building?: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  unit?: string;

  @IsTimeZone()
  @Length(1, 50)
  timezone: string;
}

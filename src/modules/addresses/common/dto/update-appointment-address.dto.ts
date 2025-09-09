import { IsEnum, IsLatitude, IsLongitude, IsOptional, IsString, Length } from "class-validator";
import { EExtCountry } from "src/modules/addresses/common/enums";
import { CountryCodeTransformer } from "src/modules/addresses/common/decorators";

export class UpdateAppointmentAddressDto {
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @IsOptional()
  @CountryCodeTransformer()
  @IsEnum(EExtCountry)
  country?: EExtCountry;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  state?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  suburb?: string;

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
}

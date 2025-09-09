import { IsEnum, IsLatitude, IsLongitude, IsNotEmpty, IsOptional, IsString, Length } from "class-validator";
import { EExtCountry } from "src/modules/addresses/common/enums";

export class CreateDraftAddressDto {
  @IsNotEmpty()
  @IsLatitude()
  latitude: number;

  @IsLongitude()
  longitude: number;

  @IsEnum(EExtCountry, {
    message: "Country must be one of the following: " + Object.values(EExtCountry).join(", "),
  })
  country: EExtCountry;

  @IsNotEmpty()
  @IsString()
  @Length(1, 100)
  state: string;

  @IsNotEmpty()
  @IsString()
  @Length(1, 100)
  suburb: string;

  @IsNotEmpty()
  @IsString()
  @Length(1, 100)
  streetName: string;

  @IsNotEmpty()
  @IsString()
  @Length(1, 10)
  streetNumber: string;

  @IsNotEmpty()
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
}

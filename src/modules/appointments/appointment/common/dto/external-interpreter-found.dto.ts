import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

export class ExternalInterpreterFoundDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string;

  @IsBoolean()
  isInterpreterFound: boolean;
}

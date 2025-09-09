import { IsBoolean, IsInt, IsOptional, Max, Min } from "class-validator";

export class UpdateMembershipDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  discount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  onDemandMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  preBookedMinutes?: number;

  @IsOptional()
  @IsBoolean()
  isMostPopular?: boolean;
}

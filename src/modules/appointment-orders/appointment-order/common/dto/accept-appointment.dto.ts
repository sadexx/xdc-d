import { Transform } from "class-transformer";
import { IsBoolean, IsOptional } from "class-validator";

export class AcceptAppointmentDto {
  @IsOptional()
  @Transform(({ value }) => value === "true")
  @IsBoolean()
  ignoreConflicts?: boolean;
}

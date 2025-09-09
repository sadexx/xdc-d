import { IsBoolean, IsOptional, IsString, Length } from "class-validator";

export class CancelAppointmentDto {
  @IsOptional()
  @IsString()
  @Length(10, 300)
  cancellationReason?: string;

  @IsOptional()
  @IsBoolean()
  isAdminCancelByClient?: boolean;
}

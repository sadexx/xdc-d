import { Type } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { IsFutureDate } from "src/common/validators";
import { IsValidAddress } from "src/modules/appointments/shared/common/validators";
import {
  MAX_APPOINTMENT_DURATION_MINUTES,
  MIN_APPOINTMENT_DURATION_MINUTES,
} from "src/modules/appointments/appointment/common/constants";
import { CreateDraftAddressDto } from "src/modules/draft-appointments/common/dto";

export class CreateDraftExtraDayDto {
  @IsDateString()
  @IsFutureDate()
  scheduledStartTime: Date;

  @IsNotEmpty()
  @IsNumber()
  @Min(MIN_APPOINTMENT_DURATION_MINUTES, { message: "Scheduling Duration must be at least 15 minutes" })
  @Max(MAX_APPOINTMENT_DURATION_MINUTES, { message: "Scheduling Duration must be at most 480 minutes" })
  schedulingDurationMin: number;

  @IsOptional()
  @IsBoolean()
  sameAddress?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateDraftAddressDto)
  @IsValidAddress()
  draftAddress?: CreateDraftAddressDto;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string;
}

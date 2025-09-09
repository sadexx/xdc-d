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
import { CreateFaceToFaceAppointmentAddressDto } from "src/modules/addresses/common/dto";
import { IsValidAddress } from "src/modules/appointments/shared/common/validators";
import {
  MAX_APPOINTMENT_DURATION_MINUTES,
  MIN_APPOINTMENT_DURATION_MINUTES,
} from "src/modules/appointments/appointment/common/constants";

export class CreateExtraDayFaceToFaceDto {
  @IsDateString()
  @IsFutureDate()
  scheduledStartTime: Date;

  @IsNotEmpty()
  @IsNumber()
  @Min(MIN_APPOINTMENT_DURATION_MINUTES, { message: "Scheduling Duration must be at least 15 minutes" })
  @Max(MAX_APPOINTMENT_DURATION_MINUTES, { message: "Scheduling Duration must be at most 480 minutes" })
  schedulingDurationMin: number;

  @IsBoolean()
  sameAddress: boolean;

  @ValidateNested()
  @Type(() => CreateFaceToFaceAppointmentAddressDto)
  @IsValidAddress()
  address?: CreateFaceToFaceAppointmentAddressDto;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string;
}

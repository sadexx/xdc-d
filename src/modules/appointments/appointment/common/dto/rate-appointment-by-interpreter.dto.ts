import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from "class-validator";
import { IsFeedbackRequiredForCallRating } from "src/modules/appointments/appointment/common/validators";

export class RateAppointmentByInterpreterDto {
  @IsInt()
  @Min(1)
  @Max(5)
  @IsFeedbackRequiredForCallRating()
  appointmentCallRating: number;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  appointmentCallRatingFeedback?: string;
}

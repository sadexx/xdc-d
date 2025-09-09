import { IsNotEmpty, IsString, IsUUID } from "class-validator";

export class OldMakeManualPayoutAttemptDto {
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  appointmentId: string;
}

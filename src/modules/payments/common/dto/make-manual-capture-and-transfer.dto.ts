import { IsNotEmpty, IsString, IsUUID } from "class-validator";

export class MakeManualCaptureAndTransferDto {
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  appointmentId: string;
}

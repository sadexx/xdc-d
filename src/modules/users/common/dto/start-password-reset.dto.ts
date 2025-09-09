import { IsString } from "class-validator";

export class StartPasswordResetDto {
  @IsString()
  identification: string;
}

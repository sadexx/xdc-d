import { IsNumber, Max, Min } from "class-validator";

export class UpdateSettingDto {
  @IsNumber()
  @Min(0)
  @Max(600)
  cancelOnDemandGracePeriodSeconds: number;
}

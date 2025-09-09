import { IsBoolean, IsNotEmpty } from "class-validator";
import { IsBooleanTrue } from "src/common/validators";

export class CreateBlacklistDto {
  @IsNotEmpty()
  @IsBoolean()
  @IsBooleanTrue()
  isNotDesired: boolean;
}

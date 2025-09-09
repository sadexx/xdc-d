import { IsNotEmpty, IsString } from "class-validator";

export class AddPaypalAccountForPayOutDto {
  @IsNotEmpty()
  @IsString()
  code: string;
}

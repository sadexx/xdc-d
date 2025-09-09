import { IsNotEmpty, IsPhoneNumber, IsString } from "class-validator";
import { NoWhitespaces } from "src/common/decorators";

export class AddPhoneNumberDto {
  @IsString()
  @IsNotEmpty()
  @NoWhitespaces()
  @IsPhoneNumber()
  phoneNumber: string;
}

import { IsNotEmpty, IsPhoneNumber, IsString } from "class-validator";
import { NoWhitespaces } from "src/common/decorators";

export class CreateCallRequestDto {
  @IsString()
  @IsNotEmpty()
  @IsPhoneNumber()
  @NoWhitespaces()
  toPhoneNumber: string;
}

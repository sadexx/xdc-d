import { IsString } from "class-validator";

export class ChangePhoneNumberDto {
  @IsString()
  phoneNumber: string;
}

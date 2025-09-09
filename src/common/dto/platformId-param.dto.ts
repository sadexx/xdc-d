import { IsNumberString, IsString, Length } from "class-validator";

export class PlatformIdParamDto {
  @IsString()
  @Length(6, 6, { message: "platformId must be exactly 6 characters long" })
  @IsNumberString()
  platformId: string;
}

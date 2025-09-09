import { IsBoolean, IsNotEmpty } from "class-validator";

export class UpdateBlacklistDto {
  @IsNotEmpty()
  @IsBoolean()
  isActive: boolean;
}

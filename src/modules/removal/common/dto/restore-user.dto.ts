import { IsUUID, Length } from "class-validator";

export class RestoreUserDto {
  @IsUUID()
  @Length(36, 36)
  restorationKey: string;
}

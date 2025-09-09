import { IsBoolean, IsUUID } from "class-validator";

export class EditOnePermissionDto {
  @IsUUID()
  id: string;

  @IsBoolean()
  isAllowed: boolean;
}

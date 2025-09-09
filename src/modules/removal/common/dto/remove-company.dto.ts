import { IsBoolean, IsOptional, IsUUID } from "class-validator";
import { Transform } from "class-transformer";
import { BadRequestException } from "@nestjs/common";

export class RemoveCompanyDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsBoolean()
  @Transform((value) => {
    if (value) {
      if (value.value === "true" || value.value === true) {
        return true;
      }

      if (value.value === "false" || value.value === false) {
        return false;
      }
    }

    throw new BadRequestException("removeAllAdminRoles must be boolean");
  })
  removeAllAdminRoles: boolean;
}

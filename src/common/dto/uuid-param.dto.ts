import { IsOptional, IsUUID, Length } from "class-validator";

export class UUIDParamDto {
  @IsUUID()
  @Length(36, 36)
  id: string;
}

export class OptionalUUIDParamDto {
  @IsOptional()
  @IsUUID()
  @Length(36, 36)
  id?: string;
}

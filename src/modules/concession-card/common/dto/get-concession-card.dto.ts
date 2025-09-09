import { IsOptional, IsUUID } from "class-validator";

export class GetConcessionCardDto {
  @IsOptional()
  @IsUUID()
  id?: string;
}

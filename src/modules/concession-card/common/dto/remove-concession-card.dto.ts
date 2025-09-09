import { IsString, IsUUID } from "class-validator";

export class RemoveConcessionCardDto {
  @IsUUID()
  @IsString()
  id: string;
}

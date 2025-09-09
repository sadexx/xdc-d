import { IsString, IsUUID } from "class-validator";

export class SendContractDto {
  @IsUUID()
  @IsString()
  id: string;
}

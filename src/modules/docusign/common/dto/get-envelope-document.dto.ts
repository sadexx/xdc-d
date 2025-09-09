import { IsString, IsUUID } from "class-validator";

export class GetEnvelopeDocumentDto {
  @IsUUID()
  @IsString()
  id: string;
}

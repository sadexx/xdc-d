import { IsOptional, IsUUID } from "class-validator";

export class GetInterpreterQuestionnaireDto {
  @IsOptional()
  @IsUUID()
  userRoleId?: string;
}

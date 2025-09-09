import { IsUUID } from "class-validator";

export class SendEmployeeInvitationLinkDto {
  @IsUUID()
  userRoleId: string;
}

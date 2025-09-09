import { IsEnum, IsUUID } from "class-validator";
import { EAvatarStatus } from "src/modules/user-avatars/common/enums";
import { IsDeclineReasonRequired } from "src/modules/users/common/validators";

export class UserAvatarsManualDecisionDto {
  @IsUUID()
  id: string;

  @IsEnum(EAvatarStatus)
  status: EAvatarStatus;

  @IsDeclineReasonRequired()
  declineReason?: string;
}

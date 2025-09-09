import { IJwtPayload } from "src/modules/tokens/common/interfaces";

export interface IJwtRegistrationPayload extends IJwtPayload {
  isOauth?: boolean;
  isInvitation?: boolean;
  isAdditionalRole?: boolean;
}

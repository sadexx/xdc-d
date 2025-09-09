import { UserRole } from "src/modules/users/entities";

export class GetUserProfileOutput {
  profile: Partial<UserRole>;
}

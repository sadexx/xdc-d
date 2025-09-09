import { Company } from "src/modules/companies/entities";
import { Session } from "src/modules/sessions/entities";
import { UserRole } from "src/modules/users/entities";

export class CreateUserProfileOutput {
  id: string;
  email: string;
  isEmailVerified: boolean;
  phoneNumber: string | null;
  isTwoStepVerificationEnabled: boolean;
  sessions: Session[];
  administratedCompany: Company | null;
  userRoles: UserRole[];
}

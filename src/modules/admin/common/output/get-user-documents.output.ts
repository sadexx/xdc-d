import { UserRole } from "src/modules/users/entities";

export class GetUserDocumentsOutput {
  documents: Partial<UserRole>;
}

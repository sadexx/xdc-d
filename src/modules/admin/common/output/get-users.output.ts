import { User } from "src/modules/users/entities";
import { PaginationOutput } from "src/common/outputs";

export class GetUsersOutput extends PaginationOutput {
  data: User[];
}

import { UserRole } from "src/modules/users/entities";
import { PaginationOutput } from "src/common/outputs";

export class GetEmployeesOutput extends PaginationOutput {
  data: UserRole[];
}

import { PaginationOutput } from "src/common/outputs";
import { Company } from "src/modules/companies/entities";

export class GetCompaniesOutput extends PaginationOutput {
  data: Company[];
}

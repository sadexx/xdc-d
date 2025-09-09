import { PaginationOutput } from "src/common/outputs";
import { NaatiInterpreter } from "src/modules/naati/entities";

export class GetAllInterpretersOutput extends PaginationOutput {
  data: NaatiInterpreter[];
}

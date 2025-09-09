import { UserConcessionCard } from "src/modules/concession-card/entities";

export class GetConcessionCardOutput extends UserConcessionCard {
  downloadLink?: string;
}

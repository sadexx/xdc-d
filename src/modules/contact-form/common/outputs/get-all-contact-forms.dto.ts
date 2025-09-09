import { PaginationOutput } from "src/common/outputs";
import { ContactForm } from "src/modules/contact-form/entities";

export class GetAllContactFormsOutput extends PaginationOutput {
  data: ContactForm[];
}

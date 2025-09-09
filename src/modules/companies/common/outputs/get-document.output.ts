import { CompanyDocument } from "src/modules/companies/entities";

export class GetDocumentOutput extends CompanyDocument {
  downloadLink: string;
}

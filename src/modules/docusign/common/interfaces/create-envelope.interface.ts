import { EExtDocusignStatus } from "src/modules/docusign/common/enums";

export interface ICreateEnvelopeInterface {
  envelopeId: string;
  uri: string;
  statusDateTime: string;
  status: EExtDocusignStatus;
}

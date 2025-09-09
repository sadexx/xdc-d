import { EExtDocusignCorporateSignerStatus } from "src/modules/docusign/common/enums";

export interface IGetEnvelopeRecipientInterface {
  signers: IRecipientInterface[];
  agents: IRecipientInterface[];
  editors: IRecipientInterface[];
  intermediaries: IRecipientInterface[];
  carbonCopies: IRecipientInterface[];
  certifiedDeliveries: IRecipientInterface[];
  inPersonSigners: IRecipientInterface[];
  seals: IRecipientInterface[];
  witnesses: IRecipientInterface[];
  notaries: IRecipientInterface[];
  recipientCount: string;
}

export interface IRecipientInterface {
  creationReason: string;
  isBulkRecipient: string;
  requireUploadSignature: string;
  name: string;
  email: string;
  recipientId: string;
  recipientIdGuid: string;
  requireIdLookup: string;
  userId: string;
  routingOrder: string;
  note: string;
  roleName: string;
  status: EExtDocusignCorporateSignerStatus;
  completedCount: string;
  deliveryMethod: string;
  recipientType: string;
}
